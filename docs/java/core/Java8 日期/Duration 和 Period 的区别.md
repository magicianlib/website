`Duration` 表示基于秒、纳秒的**时间量**（time-based amount），如"2 小时 30 分"；`Period` 表示基于年、月、日的**日期量**（date-based amount），如"2 个月 14 天"。两者都不可变、都表示"一段时间"，但单位和精度不同。

## 核心区别

| 维度 | Duration | Period |
|------|----------|--------|
| 单位 | 秒、纳秒（精确） | 年、月、日（日历） |
| 字符串 | `PT2H30M45S`（`PT` 前缀） | `P2M14D`（`P` 前缀） |
| `between` 接受 | 带时间的类型（`LocalTime` / `LocalDateTime` / `Instant` / `OffsetDateTime` / `ZonedDateTime`） | `LocalDate`（含日期） |
| 跨月计算 | 按精确秒数换算 | 按日历，月天数不固定 |
| 适用 | 计时、超时、倒计时 | 年龄、账期、订阅周期 |

## Duration

创建与表示：

```java
Duration.ofHours(2);              // PT2H
Duration.ofMinutes(90);           // PT1H30M（自动归一到小时）
Duration.ofSeconds(90);           // PT1M30S
Duration.parse("PT2H30M");        // PT2H30M

Duration d = Duration.between(LocalTime.of(10, 0), LocalTime.of(12, 30, 45)); // PT2H30M45S
d = Duration.between(instant1, instant2);   // 支持瞬时
```

读取与换算：

```java
Duration d = Duration.between(LocalTime.of(10, 0), LocalTime.of(12, 30, 45));
d.getSeconds();    // 9045（总秒数）
d.getNano();       // 0
d.toHours();       // 2
d.toMinutes();     // 150（总分钟）
d.toSeconds();     // 9045
d.toMillis();      // 9045000
```

运算：

```java
Duration.ofHours(2).plusMinutes(30);        // PT2H30M
Duration.ofMinutes(100).minusMinutes(40);   // PT1H
Duration.ofHours(2).multipliedBy(3);        // PT6H
```

`Duration.between` 要求两端支持"秒"字段，传入 `LocalDate` 会抛异常（日期没有时间概念）：

```java
Duration.between(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 2, 1));
// 抛 UnsupportedTemporalTypeException: Unsupported unit: Seconds
```

## Period

创建与表示：

```java
Period.ofYears(1);        // P1Y
Period.ofMonths(2);       // P2M
Period.ofDays(14);        // P14D
Period.of(1, 2, 3);       // P1Y2M3D（年、月、日）
Period.parse("P2M14D");   // P2M14D

Period p = Period.between(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 3, 15)); // P2M14D
```

读取：

```java
Period p = Period.between(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 3, 15));
p.getYears();         // 0
p.getMonths();        // 2
p.getDays();          // 14
p.toTotalMonths();    // 2（年、月换算的总月数，不含日分量）
```

加到日期上：

```java
LocalDate.of(2025, 1, 1).plus(Period.ofMonths(2));   // 2025-03-01
LocalDate.of(2025, 1, 31).plusMonths(1);             // 2025-02-28（目标月没有 31 号，截到月末）
```

## getDays 不是实际天数

`Period.getDays()` 是归一化后的"天"分量，不是两端相差的总天数。`Period.between` 会先把整月吃掉，剩余不足整月的天数才放进 `getDays`：

```java
Period p = Period.between(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 2, 1));
p.toString();    // P1M
p.getMonths();   // 1
p.getDays();     // 0（不是 31）
```

1 月 1 日到 2 月 1 日正好一个月，被归一化为 `P1M`，`getDays` 是 0。要取"实际差多少天"用 `ChronoUnit.DAYS.between`：

```java
ChronoUnit.DAYS.between(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 2, 1));  // 31
```

`Duration` 侧的 `toDays()` 是把总秒数除以 86400，得到的也是实际天数（但不接受 `LocalDate`）。混淆 `Period.getDays` 与实际天数是常见 bug 来源：要"日历意义上的年月日差"用 `Period`，要"绝对天数"用 `ChronoUnit.DAYS` 或 `Duration`。

## 选用

- 计时、超时、限流、倒计时：用 `Duration`（基于秒，精度稳定，不受月份长度影响）。
- 年龄、账期、订阅周期、合同期：用 `Period`（按日历年月日，符合人对"几个月"的直觉）。
- 两个日期相差几天：用 `ChronoUnit.DAYS.between`，不要用 `Period.getDays`。
