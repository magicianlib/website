$Windows$ 内存压缩（Memory Compression）主要用于优化系统内存使用效率，以减少对硬盘的读取和写入（特别是在内存资源不足时）。使用内存压缩可以避免使用到较多的分页文件，内存的解压操作比分页文件的交换速度快得多，但是也会损耗一些CPU的性能。对于内存小于或等于 $8g$ 的电脑建议开启，对于大于 $8g$ 内存的电脑建议关闭。

查看当前内存压缩信息（其中括号中的1.3MB就是已压缩的内存）：

![task_memory.png](https://@media/windows-media/memory_compress/task_memory.png)

## 查看内存压缩状态

```powershell
Get-MMAgent
```

示例：

```powershell
> Get-MMAgent

ApplicationLaunchPrefetching : True
ApplicationPreLaunch         : True
MaxOperationAPIFiles         : 256
MemoryCompression            : True  < 当前已开启内存压缩
OperationAPI                 : True
PageCombining                : False
PSComputerName               :
```

## 禁用内存压缩（重启生效）

```powershell
Disable-MMAgent -mc
# 或
Disable-MMAgent -MemoryCompression
```

示例：

![disable_mmagent.png](https://@media/windows-media/memory_compress/disable_mmagent.png)

## 启用内存压缩（重启生效）

```powershell
Enable-MMAgent -mc
# 或
Enable-MMAgent -MemoryCompression
```
