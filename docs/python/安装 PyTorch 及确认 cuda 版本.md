安装 PyTorch 深度学习框架时需要确认当前机器 cuda 版本，很多花里胡哨的文章介绍各种复杂的命令，有的居然还要关注公众号才能阅读完整内容....

哪有这么麻烦！直接在命令终端中执行 `nvidia-smi` 命令即可！以 Windows 为例：

![show-cuda-version.png](https://@media/python-media/cuda-version/show-cuda-version.png)

红框中就是当前机器 cuda 版本，我的是 12.4，之后直接到 pytorch 官网（[https://pytorch.org/get-started/locally/](https://pytorch.org/get-started/locally/)）下载该 cuda 对应安装版本即可：

![install-PyTorch.png](https://@media/python-media/cuda-version/install-PyTorch.png)

在终端中输入安装命令回车就完事了：

```bash
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

之后可以运行下面的 Python 代码检查否成功安装并支持 CUDA：

```python
import torch

# 检查是否支持 GPU
print("CUDA Available:", torch.cuda.is_available())

# 如果有 GPU，查看当前设备
if torch.cuda.is_available():
    print("Device Name:", torch.cuda.get_device_name(0))

    # 查看可用 GPU 的数量
    print(torch.cuda.device_count())

```

## 安装 CUDA Toolkit 吗？

如果只是为了机器学习，并使用 PyTorch 进行深度学习任务，通常 **不需要单独安装 CUDA Toolkit**。因为 PyTorch 的安装包已经包含了与指定 CUDA 版本对应的 **CUDA Runtime** 和必要的 GPU 加速库（如 cuDNN）。

但是如果你需要编写和编译自定义的 CUDA 内核代码，那么需要完整的安装 CUDA Toolkit：[https://developer.nvidia.com/cuda-downloads](https://developer.nvidia.com/cuda-downloads)
