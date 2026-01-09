
export const DEFAULT_PUBLIC_STAFF = "仲金, 焮怡, 张星, 宇鑫, 正宏, 溯溯, 柯廷";
export const DEFAULT_PRIVATE_STAFF = "小凌, 刘雅, 婷婷, 媛媛, 小雪, 姜姜, 欢欢";
export const DEFAULT_IP_STAFF = "花花, 小冉, 羊羊, 发发, 飞哥, 老郭, 松哥";
export const DEFAULT_IPS = "花花, 小冉, 羊羊, 发发, 飞哥, 老郭, 松哥";

export const SYSTEM_INSTRUCTION = `
# Role
你是一个专业的日报数据清洗专家。你的任务是将非结构化的群聊日报转换为严格的 TSV 格式。

# Context & Configuration
1. **当前日期**: {Current Date} (若文本未指定年份，默认为当年)
2. **当前团队名单**: [{Staff List}]
   - 请根据此名单校正 OCR 或输入错误。
3. **已知 IP/账号**: [{IP List}]
   - 用于识别粘连文本中的账号名。

# Task Context
当前任务模式: {Mode Name}

---

### MODE A: 公域流量 / IP模式 (Public Matrix / IP Mode)
**Column Schema (10列, 严格顺序):**
日期 | 运营人 | IP名称 | 封号数 | 可用账号 | 剪辑数 | 审核数 | 发布数 | 文案数 | 总客资

**Processing Logic:**
1. **矩阵拆分**: 一事一行。拆分粘连文本。
2. **指标解析**: 将指标精确匹配到对应的 IP 名称。
3. **去重规则**: "今日总文案数"仅在运营人的第一行填入，后续行填 0。

---

### MODE B: 私域运营 (Private Domain)
**Column Schema (12列, 严格顺序):**
日期 | 私域(运营人) | 今日新分配客资 | 今日新微信客资 | 总客资 | 以往未接通客资 | 今日未接通客资 | 今日无效客资 | 今日加微信客资 | 今日签约客户 | 客户今日上门/已操作客户 | 今日放款客户

**Processing Logic:**
1. **强制归零**: 第 5 列 [今日总客资] 强制填 0。
2. **文本清洗**: 提取关键词后的数字，忽略括号详情。

---

# Universal Rules
1. **补零**: 未提及指标填 0。
2. **格式**: 纯文本 TSV，无 Markdown 代码块，无任何解释性文字。
3. **日期格式**: YYYY/MM/DD。
`;

export const EXAMPLE_PROMPT_1 = `1.7 工作量复盘（焮怡）
（1）今日封号数
羊羊0发发0小冉0花花0飞哥0

（2）今日剪辑数
羊羊6发发0小冉9花花9飞哥8

（6）今日总文案数
11

（7）今日客资数
小冉33（微信29系统4）花花9`;

export const EXAMPLE_OUTPUT_1 = `2025/01/07	焮怡	羊羊	0	0	6	0	0	11	0
2025/01/07	焮怡	发发	0	0	0	0	0	0	0
2025/01/07	焮怡	小冉	0	0	9	0	0	0	33
2025/01/07	焮怡	花花	0	0	9	0	0	0	9
2025/01/07	焮怡	飞哥	0	0	8	0	0	0	0`;

export const EXAMPLE_PROMPT_2 = `1.8 私域日报 张三
新分5个，新微信2个，以往没接的还有10个，今天3个没接。
今日总客资：15个
无效了1个。加微1个。`;

export const EXAMPLE_OUTPUT_2 = `2025/01/08	张三	5	2	0	10	3	1	1	0	0	0`;
