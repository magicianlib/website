`java.time.format.DateTimeFormatter` 是 `java.time` 日期时间类型的格式化与解析入口。它不可变、线程安全，可放心声明为 `static final` 常量复用。格式由 pattern 字符串控制，**pattern 区分大小写**，`MM` 与 `mm`、`HH` 与 `hh` 含义完全不同，这是最常见的出错点。

`java.time` 各类型的基础用法见 [java.time 正确使用姿势](./java.time%20正确使用姿势.md)，本文聚焦格式化 pattern、时区与 UTC 处理。

## 占位符速查

| 占位符 | 含义 | 示例（en / zh） |
|--------|------|------|
| `yyyy` | 四位年份 | 2025 |
| `yy` | 两位年份 | 25 |
| `YYYY` | 周历年（基于 ISO 周，慎用） | 2025 / 2026 |
| `MM` | 月份，补零 | 06 |
| `MMM` / `MMMM` | 月份缩写 / 全称（受 Locale 影响） | `Jun` / `June`（zh：`6月` / `六月`） |
| `dd` | 日，补零 | 15 |
| `E` / `EEEE` | 星期缩写 / 全称（受 Locale 影响） | `Sun` / `Sunday`（zh：`周日` / `星期日`） |
| `HH` | 小时，24 小时制，补零 | 14 |
| `hh` | 小时，12 小时制，补零 | 02 |
| `mm` | 分钟，补零 | 30 |
| `ss` | 秒，补零 | 45 |
| `S` `SS` `SSS` | 小数秒（十分位 / 百分位 / 毫秒位） | 1 / 12 / 123 |
| `a` | AM / PM（受 Locale 影响） | `PM`（zh：`下午`） |
| `XXX` | 时区偏移 `+HH:mm`，UTC 显示为 `Z` | +08:00 / Z |
| `xx` | 时区偏移（无冒号） | +0800 |
| `VV` | 时区 ID | Asia/Shanghai |
| `z` / `zzzz` | 时区名（短 / 长，受 Locale 影响） | `CST` / `China Standard Time`（zh：`CST` / `中国标准时间`） |
| `'T'` `'Z'` | 字面量字符 | T / Z |

:::note
示例基于 `2025-06-15 14:30:45`（周日）上海时区。`zh` 指中文 Locale（`zh_CN`），与英文 Locale（`en`）的对照体现"受 Locale 影响"的具体差异，详见 [文本字段与 Locale](#文本字段与-Locale)。
:::

## 大小写敏感

pattern 里大小写字母代表不同字段，写反不会报错，只会得到错误结果：

- `MM` 是月份，`mm` 是分钟。写成 `yyyy-mm-dd` 会把分钟当月份，输出 `2025-30-15` 之类。
- `HH` 是 24 小时制，`hh` 是 12 小时制。单独用 `hh` 会丢失上下午（下午 2 点和凌晨 2 点都显示 `02`），12 小时制必须配 `a`。
- `ss` 是秒，`S` 是小数秒。`HH:mm:ss.SSS` 里两个 `s` 一个 `S`，不能混。

### YYYY 的周历年陷阱

`YYYY` 是 week-based-year（ISO 周历年），按"该日属于哪一年的第一周"计算，不是日历年。年末跨年边界附近会偏移：

```java
LocalDate d = LocalDate.of(2024, 12, 30); // 周一
DateTimeFormatter.ofPattern("yyyy-MM-dd").format(d); // 2024-12-30
DateTimeFormatter.ofPattern("YYYY-MM-dd").format(d); // 2025-12-30  周历年已进 2025
```

日常格式化统一用 `yyyy`，只有按 ISO 周统计的场景才用 `YYYY`。

## 时分秒与毫秒

标准时间 `HH:mm:ss`，带毫秒追加 `.SSS`：

```java
LocalDateTime dt = LocalDateTime.of(2025, 6, 15, 10, 30, 45, 123_000_000);

DateTimeFormatter.ofPattern("HH:mm:ss").format(dt);                    // 10:30:45
DateTimeFormatter.ofPattern("HH:mm:ss.SSS").format(dt);                // 10:30:45.123
DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS").format(dt);     // 2025-06-15 10:30:45.123
```

`S` 是 nano-of-second 的小数部分，`S` 的个数决定输出宽度：`SSS` 取小数前 3 位（毫秒位），不足补零，纳秒为 0 时输出 `.000`。要微秒取 `SSSSSS`、纳秒取 `SSSSSSSSS`。

12 小时制配 `a` 输出上下午。`a` 是文本字段，随 Locale 变化：

```java
DateTimeFormatter.ofPattern("yyyy-MM-dd hh:mm:ss a").format(dt); // 2025-06-15 10:30:45 上午（zh）
```

## UTC 时间

UTC（Coordinated Universal Time，协调世界时）是全球通用的时间基准，本身不带时区偏移。地球上所有时区都以 UTC 为基准加减偏移：东八区是 `UTC+8`，纽约夏令时是 `UTC-4`。换算关系是本地时间 = UTC + 偏移，反推 UTC = 本地时间 − 偏移；例如 Asia/Shanghai 墙上时间为 `2025-06-15 14:30:45`（+08:00）时，对应 UTC 为 `2025-06-15 06:30:45`（往前减 8 小时）。同一个物理瞬间在不同时区只是"墙上时钟读数"不同，UTC 表示是唯一的。

日常语境常把 UTC 与 GMT（格林尼治标准时间）混用，二者数值上几乎一致，技术上不同：GMT 基于地球自转的天文观测，UTC 基于原子钟并通过闰秒校正，使两者误差保持在 0.9 秒内。应用层两者等价，写代码统一用 UTC。

格式化里的 `Z`（Zulu）即 UTC 的零偏移标记，源自北约音标字母表里字母 Z 的读法 "Zulu"，对应零度子午线。`...Z` 与 `+00:00` 表示同一个时刻。

`java.time` 里 UTC 的体现：

- `ZoneOffset.UTC`：零偏移常量
- `Instant`：UTC 时间轴上的绝对点，`toString()` 直接输出 `2025-06-15T06:30:45Z`
- `Clock.systemUTC()`：UTC 时钟

同一瞬间在不同时区的本地表示（同一 `Instant`，数值不同但指向同一刻）：

```java
Instant instant = Instant.parse("2025-06-15T06:30:45Z");
instant.atZone(ZoneOffset.UTC);               // 2025-06-15T06:30:45+00:00[UTC]
instant.atZone(ZoneId.of("Asia/Shanghai"));   // 2025-06-15T14:30:45+08:00[Asia/Shanghai]
instant.atZone(ZoneId.of("America/New_York")); // 2025-06-15T02:30:45-04:00[America/New_York]（夏令时）
```

:::tip
存储、日志、接口传输统一用 UTC（或时间戳），只在展示层按用户时区转换，是避免跨时区 bug 的基本做法。
:::

## 时区偏移

`LocalDateTime` / `LocalDate` / `LocalTime` **不带时区**，pattern 里出现偏移占位符（`XXX` / `Z` / `VV` 等）时格式化会抛 `DateTimeException`。带时区的类型是 `OffsetDateTime`、`OffsetTime`、`ZonedDateTime`。

`XXX` 输出 `+HH:mm`，偏移恰好是 UTC 时输出字面量 `Z`（不是 `+00:00`）：

```java
ZonedDateTime sh  = ZonedDateTime.of(2025, 6, 15, 10, 30, 45, 0, ZoneId.of("Asia/Shanghai"));
ZonedDateTime utc = ZonedDateTime.of(2025, 6, 15, 10, 30, 45, 0, ZoneOffset.UTC);

DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX").format(sh);  // 2025-06-15T10:30:45+08:00
DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX").format(utc); // 2025-06-15T10:30:45Z
```

偏移占位符的几种形态：

- `XXX`：`+08:00` / `Z`（带冒号，推荐）
- `XX`：`+0800` / `Z`
- `Z`：`+0800` / `+0000`（零偏移不映射为字面量 `Z`）
- `xxx` / `xx`：同 `X` 系列但零偏移输出 `+00:00` 而非 `Z`

## Zulu 时间

Zulu 时间即 UTC 时间的字母表示，以 `Z` 结尾。pattern 里出现 `Z` 有两种写法，区别在于 `Z` 是占位符还是字面量。

**`XXX` 占位符**（动态偏移）：保留时间对象的原始偏移，碰巧是 UTC 才显示 `Z`，否则显示 `+08:00`，不会转换时间本身：

```
yyyy-MM-dd'T'HH:mm:ssXXX  →  2025-06-15T10:30:45+08:00
```

**`'Z'` 字面量 + `.withZone(UTC)`**（强制 UTC）：先把时间转成 UTC，再原样拼接字符 `Z`。东八区 10:30 被减 8 小时：

```java
DateTimeFormatter f = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")
        .withZone(ZoneOffset.UTC);
f.format(sh); // 2025-06-15T02:30:45Z
```

| 写法 | `Z` 的角色 | 东八区 10:30:45 输出 | 是否转 UTC |
|------|-----------|---------------------|-----------|
| `...XXX` | 占位符 | `...10:30:45+08:00` | 否，保留原偏移 |
| `...'Z'` + withZone(UTC) | 字面量 | `...02:30:45Z` | 是，强制转 UTC |

单写 `yyyy-MM-dd'T'HH:mm:ss'Z'` 而不 `.withZone(UTC)`，`Z` 会被当字面量拼在后面，时间却不转换，得到"假 Zulu"（带 `Z` 实际仍是本地时间），是隐蔽 bug。

`Instant` 本身是 UTC 时间轴上的点，格式化带时区的 pattern 时配 `withZone` 最稳：

```java
DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")
        .withZone(ZoneOffset.UTC).format(Instant.now()); // 2025-06-15T02:30:45Z
```

## 字面量字符

pattern 里的字母几乎都是占位符，需要原样输出的字符要区分处理：

- 字母 `T` `Z` `V` `X` 等必须用单引号包裹：`'T'` `'Z'`，否则被当占位符。
- 标点 `- : / . [ ]` 和空格不是 pattern 字母，直接写，无需转义。
- 输出单引号本身用两个单引号 `''`。

高频组合：

```java
"yyyy-MM-dd'T'HH:mm:ss"           // 2025-06-15T10:30:45
"yyyy-MM-dd'T'HH:mm:ssXXX"        // 2025-06-15T10:30:45+08:00
"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"    // 字面量 Z（配合 withZone(UTC)）
```

## 文本字段与 Locale

`MMM`/`MMMM`（月份）、`E`/`EEEE`（星期）、`a`（上下午）、`z`/`zzzz`（时区名）是文本字段，输出随 Locale 变化；纯数字占位符（`yyyy MM dd HH mm ss SSS`）以及 `XXX`（偏移）、`VV`（时区 ID）不受影响。同一时间 `2025-06-15 14:30:45`（周日，上海时区）在英文与中文 Locale 下的完整对照见上方[占位符速查](#占位符速查)表，要点是中文 Locale 下月份可能是 `6月` 或 `六月`、星期是 `周日` / `星期日`、上下午是 `下午`，与英文完全不同。

注意区分 **Locale** 与**时区**，两者无关：

- Locale（语言环境，如 `zh_CN`、`Locale.US`）决定文本字段用什么**语言**显示。`ofPattern(pattern)` 不传 Locale 时取 `Locale.getDefault()`，中文系统默认通常是 `zh_CN`。
- 时区（`ZoneId`，如 `Asia/Shanghai`）决定时间**数值**（墙上时钟读数）。

`Asia/Shanghai` 是时区不是 Locale，它不会让月份显示成中文还是英文；显示中文是 `zh_CN` Locale 的作用。容器化部署时两者都受镜像环境变量（`LANG`、`TZ`）影响，容易一起被误改，排查时区分对待。

服务端格式化建议显式指定 Locale，避免容器 locale 差异导致输出漂移；要稳定可复现的输出用 `Locale.ROOT` 或 `Locale.US`：

```java
DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss", Locale.ROOT);
```

## 使用要点

**线程安全**：`DateTimeFormatter` 不可变，多线程共享无需同步。每次调用 `ofPattern` 创建新实例有开销，固定格式应声明为常量：

```java
private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
```

:::note[解析严格度]
`ofPattern` 默认 `ResolverStyle.SMART`，对不合理字段会智能调整（如 1 月 32 日滚到 2 月 1 日）。需要严格校验用 `withResolverStyle(STRICT)`，但 STRICT 下 `ofPattern("yyyy-MM-dd")` 解析会抛 `DateTimeParseException`：`yyyy` 是"纪元年"（year-of-era），严格模式要求同时给出纪元（era）才能组装成日期。两种解法：

- 用 `uuuu` 替代 `yyyy`：`u` 是绝对纪年（proleptic year），无纪元概念，严格模式可正常解析。
- 直接用预定义常量 `DateTimeFormatter.ISO_LOCAL_DATE` / `ISO_LOCAL_DATE_TIME`，内部基于 `uuuu` 且为 STRICT，开箱即用。
:::

## 常用日期格式速览

按用途归类的高频日期格式，pattern、示例（基于 `2025-06-15 10:30:45.123` 东八区）与适用类型对应如下：

| 格式 | pattern | 示例 | 适用类型 |
|------|---------|------|----------|
| 紧凑日期时间（无分隔符） | `yyyyMMddHHmmssSSS` | `20250615103045123` | LocalDateTime |
| 标准日期时间 | `yyyy-MM-dd HH:mm:ss` | `2025-06-15 10:30:45` | LocalDateTime |
| 标准日期时间（带毫秒） | `yyyy-MM-dd HH:mm:ss.SSS` | `2025-06-15 10:30:45.123` | LocalDateTime |
| 斜杠日期时间 | `yyyy/MM/dd HH:mm:ss` | `2025/06/15 10:30:45` | LocalDateTime |
| 纯日期 | `yyyy-MM-dd` | `2025-06-15` | LocalDate |
| 纯时间 | `HH:mm:ss` | `10:30:45` | LocalTime |
| 纯时间（带毫秒） | `HH:mm:ss.SSS` | `10:30:45.123` | LocalTime |
| ISO 带偏移日期时间 | `yyyy-MM-dd'T'HH:mm:ss.SSSXXX` | `2025-06-15T10:30:45.123+08:00` | OffsetDateTime/ZonedDateTime |
| 偏移时间 | `HH:mm:ss.SSSXXX` | `10:30:45.123+08:00` | OffsetTime |
| ISO Zulu（UTC） | `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'` | `2025-06-15T02:30:45.123Z` | Instant/ZonedDateTime/OffsetDateTime |
| 带时区 ID | `yyyy-MM-dd HH:mm:ss XXX '['VV']'` | `2025-06-15 10:30:45 +08:00 [Asia/Shanghai]` | ZonedDateTime |

带 `'Z'` 字面量的 Zulu 格式需配合 `.withZone(ZoneOffset.UTC)` 才会真正转换为 UTC，否则只是原样拼了个 `Z`（详见 [Zulu 时间](#Zulu-时间)）；`XXX` 占位符则保留输入的原始偏移。
