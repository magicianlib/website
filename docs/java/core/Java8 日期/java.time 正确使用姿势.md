`java.time`（JDK 8 引入）是替代 `java.util.Date` / `Calendar` 的日期时间 API，所有类型不可变、线程安全。类型按是否含时区分为三类：

- 本地类型（不含时区）：`LocalDate`、`LocalTime`、`LocalDateTime`
- 偏移 / 时区类型：`OffsetDateTime`、`OffsetTime`、`ZonedDateTime`
- 时间轴瞬时：`Instant`

选用原则：表示"日历上的日期 / 钟表上的时间"用 `Local*`；存储、传输、计算时间点用 `Instant`；需要按地区呈现或换算用 `ZonedDateTime`。

## LocalDate

只含年月日的日期，无时区。默认字符串 `2025-06-15`。

创建：

```java
LocalDate.now();                 // 当前日期（按系统时区）
LocalDate.of(2025, 6, 15);       // 指定年月日
LocalDate.parse("2025-06-15");   // 解析，默认 ISO 格式
```

常用属性：

```java
LocalDate d = LocalDate.of(2025, 6, 15);
d.getYear();            // 2025
d.getMonthValue();      // 6（getMonth() 返回枚举 JUNE）
d.getDayOfMonth();      // 15
d.getDayOfWeek();       // SUNDAY
d.getDayOfYear();       // 166
d.lengthOfMonth();      // 30（6 月天数）
d.isLeapYear();         // false
```

加减与比较：

```java
d.plusDays(1);                // 2025-06-16
d.minusMonths(1);             // 2025-05-15
d.plus(1, ChronoUnit.YEARS);  // 2026-06-15

d.isBefore(LocalDate.of(2025, 7, 1));   // true
d.isAfter(LocalDate.of(2025, 5, 1));    // true
d.isEqual(LocalDate.of(2025, 6, 15));   // true
```

`with` 系列按字段调整：

```java
d.withDayOfMonth(1);                              // 2025-06-01
d.with(TemporalAdjusters.lastDayOfMonth());       // 2025-06-30
d.with(TemporalAdjusters.next(DayOfWeek.MONDAY)); // 下一个周一
```

拼接时间得到 `LocalDateTime`：

```java
d.atTime(10, 30, 45);   // 2025-06-15T10:30:45
d.atStartOfDay();       // 2025-06-15T00:00（当天的 0 点）
```

## LocalTime

只含时分秒纳秒的时间，无时区。默认字符串 `10:30:45`，纳秒非零时追加小数 `10:30:45.123`。

```java
LocalTime.now();
LocalTime.of(10, 30);                          // 10:30
LocalTime.of(10, 30, 45);                      // 10:30:45
LocalTime.of(10, 30, 45, 123_000_000);         // 10:30:45.123

LocalTime t = LocalTime.of(10, 30, 45);
t.getHour();       // 10
t.getMinute();     // 30
t.getSecond();     // 45
t.getNano();       // 0

t.plusHours(1);     // 11:30:45
t.plusMinutes(90);  // 12:00:45（自动进位）
```

## LocalDateTime

`LocalDate` 与 `LocalTime` 的组合，无时区。默认字符串 `2025-06-15T10:30:45`（ISO 格式，日期与时间用 `T` 分隔）。

```java
LocalDateTime.now();
LocalDateTime.of(2025, 6, 15, 10, 30, 45);
LocalDateTime.of(LocalDate.now(), LocalTime.now());
LocalDateTime.parse("2025-06-15T10:30:45");

LocalDateTime dt = LocalDateTime.of(2025, 6, 15, 10, 30, 45);
dt.plusDays(1).minusHours(2);   // 2025-06-16T08:30:45
dt.toLocalDate();               // 2025-06-15
dt.toLocalTime();               // 10:30:45
```

`LocalDateTime` 不含时区，不能直接转 `Instant`，必须先关联一个时区：

```java
dt.atZone(ZoneId.of("Asia/Shanghai")).toInstant();  // 2025-06-15T02:30:45Z
```

## Instant

UTC 时间轴上的瞬时点（机器时间），默认字符串 `2025-06-15T15:06:40Z`（始终 UTC，以 `Z` 结尾）。它是与 `Date` 最接近、互转最直接的类型。

```java
Instant.now();                  // 当前瞬时（UTC）
Instant.ofEpochSecond(0L);      // 1970-01-01T00:00:00Z
Instant.ofEpochMilli(0L);       // 1970-01-01T00:00:00Z
Instant.parse("2025-06-15T15:06:40Z");

Instant inst = Instant.now();
inst.getEpochSecond();          // 1970 至今的秒
inst.toEpochMilli();            // 1970 至今的毫秒（等同 System.currentTimeMillis()）
inst.getNano();                 // 秒内的纳秒部分
```

`Instant` 只支持秒 / 毫秒 / 纳秒粒度的加减，没有 `plusDays`；加天数用 `Duration`：

```java
inst.plusSeconds(90);           // 加 90 秒
inst.plusMillis(500);           // 加 500 毫秒
inst.plus(Duration.ofDays(1));  // 加 1 天（= 24 小时）
```

## ZoneId 与 ZoneOffset

时区是 `ZonedDateTime` / `OffsetDateTime` 的基础，两个相关类型：

- `ZoneId`：地理时区，如 `Asia/Shanghai`，内含夏令时等规则，偏移会随日期变化。
- `ZoneOffset`：固定偏移，如 `+08:00`，不含规则；`ZoneOffset.UTC` 是零偏移常量。

```java
ZoneId.of("Asia/Shanghai");
ZoneId.of("America/New_York");
ZoneOffset.ofHours(8);     // +08:00
ZoneOffset.UTC;            // +00:00
```

时区 ID 用 IANA 命名（`区域/城市`），不要用 `CST`、`GMT+8` 这类缩写或旧写法，缩写有歧义：`CST` 在美国是中部时间、在中国是标准时间。

## OffsetDateTime / OffsetTime

带固定偏移的日期时间 / 时间，不含时区规则（不知道该偏移何时会因夏令时变化）。默认字符串 `2025-06-15T10:30:45+08:00`、`10:30:45+08:00`。

```java
OffsetDateTime.of(2025, 6, 15, 10, 30, 45, 0, ZoneOffset.ofHours(8)); // 2025-06-15T10:30:45+08:00
OffsetTime.of(10, 30, 45, 0, ZoneOffset.ofHours(8));                  // 10:30:45+08:00
```

适合"偏移已知、无需换算历史夏令时"的场景，如 HTTP 头、日志、协议字段。需要按地区换算或跨夏令时计算用 `ZonedDateTime`。

## ZonedDateTime

带完整时区的日期时间（时区 ID + 偏移），默认字符串 `2025-06-15T10:30:45+08:00[Asia/Shanghai]`。

```java
ZonedDateTime.now();   // 系统时区
ZonedDateTime.of(2025, 6, 15, 10, 30, 45, 0, ZoneId.of("Asia/Shanghai"));
LocalDateTime.of(2025, 6, 15, 10, 30, 45).atZone(ZoneId.of("Asia/Shanghai"));
```

同一瞬间换时区用 `withZoneSameInstant`，时间值随之改变但指向同一刻：

```java
ZonedDateTime sh = ZonedDateTime.of(2025, 6, 15, 10, 30, 45, 0, ZoneId.of("Asia/Shanghai"));
sh.withZoneSameInstant(ZoneOffset.UTC);                // 2025-06-15T02:30:45Z
sh.withZoneSameInstant(ZoneId.of("America/New_York")); // 2025-06-14T22:30:45-04:00[America/New_York]
```

纽约结果是前一天 22:30：6 月纽约处于夏令时（UTC-4），东八区 10:30 比 UTC 早 8 小时、比纽约早 12 小时。`withZoneSameLocal` 则相反，保留"墙上时间"不变、只换时区，指向的是不同瞬间。

## 类型间转换

`LocalDateTime`（无时区）、`OffsetDateTime`（固定偏移）、`ZonedDateTime`（时区 ID）三者以及 `Instant` 之间可两两互转。下表列出各方向的转换方法：

| 起点 → 目标 | LocalDateTime | OffsetDateTime | ZonedDateTime | Instant |
|------|------|------|------|------|
| **LocalDateTime** | — | `atOffset(offset)` | `atZone(zoneId)` | `atZone(zoneId).toInstant()` |
| **OffsetDateTime** | `toLocalDateTime()` | — | `toZonedDateTime()` | `toInstant()` |
| **ZonedDateTime** | `toLocalDateTime()` | `toOffsetDateTime()` | — | `toInstant()` |
| **Instant** | `LocalDateTime.ofInstant(in, zone)` | `OffsetDateTime.ofInstant(in, zone)` | `atZone(zoneId)` | — |

转换语义要点：

- `LocalDateTime` 没有时区，转 `OffsetDateTime` / `ZonedDateTime` / `Instant` 必须显式提供偏移或时区（`atOffset` / `atZone`），墙上时间值不变，只是补上时区信息。
- 反方向（`toLocalDateTime`）丢弃时区信息，只保留"墙上时间"。
- `OffsetDateTime.toZonedDateTime()` 把偏移当作时区（如 `+08:00`），不含地理时区的夏令时规则；要从 `Instant` 得到带地理时区的 `ZonedDateTime` 用 `atZone(ZoneId.of("Asia/Shanghai"))`。

示例（`LocalDateTime` 为 `2025-06-15T10:30:45`，按东八区解读）：

```java
LocalDateTime ldt = LocalDateTime.of(2025, 6, 15, 10, 30, 45);
ZoneId sh = ZoneId.of("Asia/Shanghai");

ldt.atOffset(ZoneOffset.ofHours(8));   // 2025-06-15T10:30:45+08:00      -> OffsetDateTime
ldt.atZone(sh);                        // 2025-06-15T10:30:45+08:00[Asia/Shanghai] -> ZonedDateTime
ldt.atZone(sh).toInstant();            // 2025-06-15T02:30:45Z           -> Instant

Instant inst = ldt.atZone(sh).toInstant();
ZonedDateTime.ofInstant(inst, sh);      // ...10:30:45+08:00[Asia/Shanghai]
OffsetDateTime.ofInstant(inst, sh);     // ...10:30:45+08:00
LocalDateTime.ofInstant(inst, sh);      // 2025-06-15T10:30:45
LocalDateTime.ofInstant(inst, ZoneOffset.UTC); // 2025-06-15T02:30:45（UTC 视图）
```

同一个 `Instant` 用不同时区呈现，得到的 `LocalDateTime` 不同，但指向同一瞬间。纯时间类型同理：`LocalTime.atOffset(offset)` 得 `OffsetTime`，`OffsetTime.toLocalTime()` 转回。

## 与旧 API 互转

`Date` 与 `Instant` 直接互转，`Date` 本质就是 UTC 毫秒：

```java
Instant inst = Instant.now();

Date date = Date.from(inst);   // Instant -> Date
Instant back = date.toInstant();   // Date -> Instant
```

`Date` 的 `toString` 用 JVM 默认时区显示（如 `Sat Jul 18 14:00:49 CST 2026`），但内部值是 UTC 毫秒，互转不依赖 JVM 时区。

与 epoch 毫秒：

```java
long millis = System.currentTimeMillis();
Instant inst = Instant.ofEpochMilli(millis);
long back = inst.toEpochMilli();
```

`Calendar` 没有直接互转方法，转 `java.time` 通常先取 `toInstant()` 再用。

格式化与解析（`DateTimeFormatter`、pattern 占位符、时区与 UTC 处理）见 [日期格式化 DateTimeFormatter](./日期格式化%20DateTimeFormatter.md)。

## 设计原则

- 类型不可变、线程安全，无需同步，可作常量共享。
- 用工厂方法创建（`now` / `of` / `parse`），不直接 `new`。
- 存储、传输、跨系统交互用 `Instant` 或 epoch 毫秒（UTC，无歧义），展示时再按用户时区转 `ZonedDateTime` / `LocalDateTime`。
- 涉及时区一律用 IANA 时区 ID（`Asia/Shanghai`），避免缩写。
