// EXPORTS: parseWorkforceFile, ParseResult, ParseWarning
import * as XLSX from 'xlsx';
import {
  findHeaderRow,
  mapHeadersToStandard,
  getColIndex,
  parseCsvLine,
  detectDelimiter,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
} from './templateColumns';
import { MONTHS, type IPosition } from './mockPlanData';

export interface ParseWarning {
  row: number;
  col: string;
  message: string;
  type: 'error' | 'warning';
}

export interface ParseResult {
  success: boolean;
  positions: IPosition[];
  errors: ParseWarning[];
  warnings: ParseWarning[];
  recognizedColumns: string[];
  missingRequired: string[];
  missingOptional: string[];
  rawHeaders: string[];
  headerRowIndex: number;
}

/**
 * 尝试用 TextDecoder 检测并解码 CSV 文件内容（UTF-8 / GBK 等）
 */
async function decodeCsvContent(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 检测 BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buffer);
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buffer);
  }

  // 先尝试 UTF-8
  const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
  const utf8Text = utf8Decoder.decode(buffer);
  // 如果 UTF-8 解码后包含大量替换字符，尝试 GBK
  const replacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
  const nonAsciiCount = utf8Text.split('').filter((c) => c.charCodeAt(0) > 127).length;
  if (nonAsciiCount > 0 && replacementCount / nonAsciiCount > 0.3) {
    try {
      return new TextDecoder('gbk').decode(buffer);
    } catch {
      return utf8Text;
    }
  }
  return utf8Text;
}

/**
 * 从 CSV 文本解析成二维字符串数组
 */
function csvTo2DArray(text: string): string[][] {
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);

  const rows: string[][] = [];
  for (const line of lines) {
    rows.push(parseCsvLine(line, delimiter));
  }
  return rows;
}

/**
 * 从 xlsx 文件解析成二维字符串数组
 */
function xlsxTo2DArray(buffer: ArrayBuffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'array', cellText: true, raw: false });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = wb.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  }) as string[][];
  return data.filter((row) => row.some((cell) => cell && cell.toString().trim()));
}

/**
 * 统一解析人力规划导入文件（支持 .csv, .xlsx, .xls）
 */
export async function parseWorkforceFile(file: File): Promise<ParseResult> {
  const errors: ParseWarning[] = [];
  const warnings: ParseWarning[] = [];
  const positions: IPosition[] = [];

  let dataRows: string[][] = [];

  const ext = file.name.toLowerCase().split('.').pop();

  try {
    if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      dataRows = xlsxTo2DArray(buffer);
    } else {
      const text = await decodeCsvContent(file);
      dataRows = csvTo2DArray(text);
    }
  } catch (e) {
    return {
      success: false,
      positions: [],
      errors: [
        { row: 0, col: '文件', message: `文件解析失败：${e instanceof Error ? e.message : String(e)}`, type: 'error' },
      ],
      warnings: [],
      recognizedColumns: [],
      missingRequired: [...REQUIRED_COLUMNS],
      missingOptional: [...OPTIONAL_COLUMNS],
      rawHeaders: [],
      headerRowIndex: 0,
    };
  }

  if (dataRows.length === 0) {
    return {
      success: false,
      positions: [],
      errors: [{ row: 0, col: '文件', message: '文件内容为空', type: 'error' }],
      warnings: [],
      recognizedColumns: [],
      missingRequired: [...REQUIRED_COLUMNS],
      missingOptional: [...OPTIONAL_COLUMNS],
      rawHeaders: [],
      headerRowIndex: 0,
    };
  }

  // 自动定位表头行
  const headerRowIndex = findHeaderRow(dataRows);
  const rawHeaders = dataRows[headerRowIndex] || [];
  const headerMap = mapHeadersToStandard(rawHeaders);

  const recognizedColumns: string[] = [];
  for (const h of rawHeaders) {
    const std = headerMap.get(h);
    if (std) recognizedColumns.push(std);
  }

  // 检查必填列
  const missingRequired = REQUIRED_COLUMNS.filter((c) => !recognizedColumns.includes(c));
  const missingOptional = OPTIONAL_COLUMNS.filter((c) => !recognizedColumns.includes(c));

  if (missingRequired.length > 0) {
    const recognizedList = recognizedColumns.length > 0 ? recognizedColumns.join('、') : '（无）';
    errors.push({
      row: headerRowIndex + 1,
      col: '表头',
      message: `缺少必要列：${missingRequired.join('、')}。已识别到的列：${recognizedList}`,
      type: 'error',
    });
  }

  // 可选列缺失提示（warning，不阻断）
  if (missingOptional.length > 0) {
    warnings.push({
      row: headerRowIndex + 1,
      col: '表头',
      message: `未识别到以下可选列，默认置 0：${missingOptional.join('、')}，可稍后补填`,
      type: 'warning',
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      positions: [],
      errors,
      warnings,
      recognizedColumns,
      missingRequired,
      missingOptional,
      rawHeaders,
      headerRowIndex,
    };
  }

  // 辅助函数：获取某标准列的值
  const getCol = (values: string[], stdName: string): string => {
    const idx = getColIndex(headerMap, rawHeaders, stdName);
    return idx >= 0 ? (values[idx]?.trim() ?? '') : '';
  };

  // 逐行解析数据
  for (let i = headerRowIndex + 1; i < dataRows.length; i++) {
    const values = dataRows[i];
    if (!values || values.every((v) => !v || !v.trim())) continue;
    const firstCell = values[0]?.trim() || '';
    if (firstCell.startsWith('填写说明') || firstCell.startsWith('说明：') || firstCell.startsWith('备注')) {
      continue;
    }

    const rowNum = i + 1;

    const department = getCol(values, '部门');
    const name = getCol(values, '岗位名称');
    const level = getCol(values, '职级');

    if (!department) errors.push({ row: rowNum, col: '部门', message: '部门不能为空', type: 'error' });
    if (!name) errors.push({ row: rowNum, col: '岗位名称', message: '岗位名称不能为空', type: 'error' });

    const currentHcStr = getCol(values, '当前在职人数');
    const currentHc = currentHcStr ? parseInt(currentHcStr, 10) : 0;
    if (currentHcStr && (isNaN(currentHc) || currentHc < 0)) {
      errors.push({ row: rowNum, col: '当前在职人数', message: '必须是非负整数', type: 'error' });
    }

    // 月度编制：优先从各月列读取，缺列时取当前在职人数
    const monthlyHeadcount: number[] = [];
    for (let m = 0; m < 12; m++) {
      const colName = `${MONTHS[m]}编制`;
      const valStr = getCol(values, colName);
      if (valStr) {
        const val = parseInt(valStr, 10);
        monthlyHeadcount.push(isNaN(val) ? currentHc : Math.max(0, val));
      } else {
        monthlyHeadcount.push(currentHc);
      }
    }

    // 成本项（缺省置 0）
    const fixedSalaryStr = getCol(values, '月固定工资');
    const fixedSalary = fixedSalaryStr ? parseFloat(fixedSalaryStr) : 0;
    if (fixedSalaryStr && (isNaN(fixedSalary) || fixedSalary < 0)) {
      errors.push({ row: rowNum, col: '月固定工资', message: '必须是非负数字', type: 'error' });
    }

    const variableRatioStr = getCol(values, '浮动工资比例');
    let variableRatio = 0.2;
    if (variableRatioStr) {
      const num = parseFloat(variableRatioStr);
      if (!isNaN(num) && num >= 0) {
        variableRatio = num > 1 ? num / 100 : num;
        if (variableRatio > 1) variableRatio = 1;
      }
    }

    const socialInsurance = parseFloat(getCol(values, '雇主社保公积金') || '0') || 0;
    const welfare = parseFloat(getCol(values, '福利费用') || '0') || 0;
    const specialCost = parseFloat(getCol(values, '专项费用') || '0') || 0;

    const arrivalMonthRaw = parseInt(getCol(values, '预计到岗月份') || '1', 10);
    const arrivalMonth = isNaN(arrivalMonthRaw) || arrivalMonthRaw < 1 || arrivalMonthRaw > 12
      ? 1
      : arrivalMonthRaw;

    if (department && name) {
      positions.push({
        id: `pos-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        department,
        name,
        level: level || 'P5',
        currentHeadcount: isNaN(currentHc) ? 0 : Math.max(0, currentHc),
        monthlyHeadcount,
        monthlyFixedSalary: Math.max(0, fixedSalary),
        variableRatio,
        socialInsurance: Math.max(0, socialInsurance),
        welfare: Math.max(0, welfare),
        specialCost: Math.max(0, specialCost),
        expectedArrivalMonth: arrivalMonth,
      });
    }
  }

  return {
    success: errors.length === 0,
    positions,
    errors,
    warnings,
    recognizedColumns,
    missingRequired,
    missingOptional,
    rawHeaders,
    headerRowIndex,
  };
}
