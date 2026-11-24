// EXPORTS: TEMPLATE_COLUMNS, REQUIRED_COLUMNS, OPTIONAL_COLUMNS, COLUMN_ALIASES, findHeaderRow, parseCsvLine, mapHeadersToStandard, getColIndex, normalizeColName, detectDelimiter
import { MONTHS } from './mockPlanData';

/**
 * 标准模板列定义 —— 模板导出和上传校验共同引用，禁止两边各写一套
 */
export const TEMPLATE_COLUMNS = [
  '部门',
  '岗位名称',
  '职级',
  '当前在职人数',
  ...MONTHS.map((m) => `${m}编制`),
  '月固定工资',
  '浮动工资比例',
  '雇主社保公积金',
  '福利费用',
  '专项费用',
  '预计到岗月份',
];

/**
 * 硬必填列（缺失则阻断导入）
 */
export const REQUIRED_COLUMNS = ['部门', '岗位名称'];

/**
 * 可选列（缺失时默认置 0，不阻断导入）
 */
export const OPTIONAL_COLUMNS = [
  '职级',
  '当前在职人数',
  '月固定工资',
  '浮动工资比例',
  '雇主社保公积金',
  '福利费用',
  '专项费用',
  '预计到岗月份',
];

/**
 * 列名别名映射（容错匹配用）
 * key: 标准列名
 * value: 可能出现的别名
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  '部门': [
    '部门', 'department', 'dept', '所属部门', '部门名称', '一级部门', '二级部门',
    '部门(dept)', '部门名称(deptname)', '组织', '组织架构',
  ],
  '岗位名称': [
    '岗位名称', 'position', '岗位', '职位', '职位名称', 'jobtitle', 'job_title',
    '岗位(职位)', '职位(title)', '岗位名', '职务', '职务名称',
  ],
  '职级': [
    '职级', 'level', 'grade', '级别', '岗位级别', '职等', '职位等级', '层级',
    '职级(level)', 'grade等级',
  ],
  '当前在职人数': [
    '当前在职人数', 'currentheadcount', '在职人数', '现有人数', '现有编制', '人数',
    '现有员工数', 'headcount', 'hc', '现有员工', '在职员工数', '现有人员',
    '编制人数', '现有人力', '当前人数', '当前编制', '在编人数',
  ],
  '月固定工资': [
    '月固定工资', 'monthlyfixedsalary', '固定工资', '基本工资', '底薪', '月薪',
    '月基本工资', '固定薪资', '基本薪资', '月薪资', '工资', '月工资',
    '月固定薪资', 'basepay', 'basesalary', '基本工资(元)',
  ],
  '浮动工资比例': [
    '浮动工资比例', 'variableratio', '浮动比例', '浮动工资', '绩效比例', '奖金比例',
    '绩效奖金比例', '浮动比例(%)', '浮动率', '绩效系数', '变动工资比例',
  ],
  '雇主社保公积金': [
    '雇主社保公积金', 'socialinsurance', '社保公积金', '社保', '五险一金',
    '社保公积金（雇主）', '社保公积金(雇主承担)', '雇主社保', '社保公司部分',
    '公司社保', '社保公积金单位部分', '社保公积金（单位）',
  ],
  '福利费用': [
    '福利费用', 'welfare', '福利', '福利费', '员工福利', '福利金',
    '年节福利', '员工福利费',
  ],
  '专项费用': [
    '专项费用', 'specialcost', '专项', '专项成本', '其他费用', '附加费用',
    '额外费用', '专项补贴',
  ],
  '预计到岗月份': [
    '预计到岗月份', 'expectedarrivalmonth', '到岗月份', '到岗时间', '入职月份',
    '预计入职月', '到岗月', '入职月', '预计到岗时间', '到岗日期月份',
  ],
};

// 初始化月份编制列的别名
for (let i = 0; i < 12; i++) {
  const stdName = `${MONTHS[i]}编制`;
  COLUMN_ALIASES[stdName] = [
    stdName,
    `${MONTHS[i]}月编制`,
    `${MONTHS[i]}月份编制`,
    `${i + 1}月编制`,
    `${i + 1}月`,
    `${i + 1}月份`,
    `${MONTHS[i]}`,
    `month${i + 1}`,
    `m${i + 1}`,
    `第${i + 1}月编制`,
    `${MONTHS[i]}规划编制`,
  ];
}

/**
 * 规范化列名字符串：去空格、去全角字符、转小写、去特殊符号
 * 用于容错匹配
 */
export function normalizeColName(name: string): string {
  return name
    .trim()
    .replace(/^\uFEFF/, '')
    // 全角转半角
    .replace(/[\uff01-\uff5e]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    // 全角空格转半角
    .replace(/\u3000/g, ' ')
    // 去除常见分隔符和符号
    .replace(/[\s\-_（）()【】[\]《》""''""''、，。.：:；;·•/\\|～~!！?？@#$%^&*+=<>`]/g, '')
    .toLowerCase();
}

/**
 * 构建标准列名 -> 别名集合 的映射
 */
function buildAliasMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [stdName, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      map.set(normalizeColName(alias), stdName);
    }
  }
  return map;
}

const ALIAS_MAP = buildAliasMap();

/**
 * 把用户上传的表头映射为标准列名
 * 返回：Map<用户原始列名, 标准列名>
 */
export function mapHeadersToStandard(headers: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const usedStandard = new Set<string>();
  for (const header of headers) {
    const normalized = normalizeColName(header);
    if (!normalized) continue;
    const stdName = ALIAS_MAP.get(normalized);
    if (stdName && !usedStandard.has(stdName)) {
      result.set(header, stdName);
      usedStandard.add(stdName);
    }
  }
  return result;
}

/**
 * 在二维数组中自动定位表头行（扫描前 N 行）
 * 判定规则：某行同时包含『部门』和『岗位名称』的同义词 → 判定为表头行
 * 返回：表头行索引（0-based），找不到返回 0
 */
export function findHeaderRow(dataRows: string[][]): number {
  const scanRows = Math.min(dataRows.length, 10);
  for (let i = 0; i < scanRows; i++) {
    const cells = dataRows[i];
    const normalized = cells.map((h) => normalizeColName(h)).filter(Boolean);
    if (normalized.length < 2) continue;

    const hasDept = normalized.some((n) => {
      const keys = ['部门', 'department', 'dept', '所属部门', '部门名称', '一级部门', '二级部门', '组织'];
      return keys.some((k) => n === normalizeColName(k));
    });
    const hasPosition = normalized.some((n) => {
      const keys = ['岗位名称', 'position', '岗位', '职位', '职位名称', 'jobtitle', '职务'];
      return keys.some((k) => n === normalizeColName(k));
    });
    const hasSalary = normalized.some((n) => {
      const keys = ['月固定工资', '固定工资', '基本工资', '底薪', '月薪', '月基本工资'];
      return keys.some((k) => n === normalizeColName(k));
    });
    const hasHeadcount = normalized.some((n) => {
      const keys = ['当前在职人数', '在职人数', '现有人数', '人数', 'headcount', 'hc'];
      return keys.some((k) => n === normalizeColName(k));
    });

    const matches = [hasDept, hasPosition, hasSalary, hasHeadcount].filter(Boolean).length;
    if (matches >= 3 || (hasDept && hasPosition)) {
      return i;
    }
  }
  return 0;
}

/**
 * 检测 CSV 分隔符：从逗号、分号、制表符中选一个使第一行列数最多且 > 1 的
 */
export function detectDelimiter(line: string): string {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let maxCols = 0;
  for (const d of candidates) {
    const count = line.split(d).length;
    if (count > maxCols && count >= 2) {
      maxCols = count;
      best = d;
    }
  }
  return best;
}

/**
 * 解析一行 CSV（处理简单引号包裹、支持自定义分隔符）
 */
export function parseCsvLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((s) => s.trim().replace(/^\uFEFF/, ''));
}

/**
 * 获取列索引：按标准列名查找，找不到返回 -1
 */
export function getColIndex(
  headerMap: Map<string, string>,
  headers: string[],
  stdName: string,
): number {
  for (let i = 0; i < headers.length; i++) {
    if (headerMap.get(headers[i]) === stdName) return i;
  }
  return -1;
}
