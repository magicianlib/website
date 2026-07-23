---
slug: Rsa 密匙对生成
title: Rsa 密匙对生成
date: 2023-01-23T16:27
tags: [加密]
---

## 前言

生成 rsa 密匙对有许多中方式，而在系统中使用最多的就是 `openssl`。如果你的操作系统还没有 openssl，就需要手动安装。

Windows 用户需要到官网 [https://www.openssl.org](https://www.openssl.org) 进行下载安装。

Unix 用户可以直接使用默认的包管理工具进行安装。具体可以参考：[https://command-not-found.com/openssl](https://command-not-found.com/openssl)，这里提供了各种发行版对应的安装命令。

<!-- truncate -->

本文讲 RSA 密钥对的具体生成。概念与选型见[《非对称加密算法与应用场景》](/blog/非对称加密算法与应用场景/)，ECC 密钥对生成见[《ECC 密钥对生成》](/blog/ECC%20密钥对生成/)。

## OpenSSL 生成 RSA 密钥对

### 生成私钥

```bash
$ openssl genrsa -out private_key.pem length
```

- `private_key.pem`：输出的私钥文件名
- `length`：指定私钥长度（如 1024、2048），越长表示加密性越强。

`openssl genrsa` 命令默认生成的是 PEM 格式私钥文件，PEM (Privacy-Enhanced Mail) 是一种常见的密钥和证书格式，它使用 Base64 编码的 ASCII 文本表示密钥和证书，并且通常以 .pem 作为文件扩展名。

:::tip
需要特别说明说明的一点是，openssl 在 3.0 之前 `openssl genrsa` 命令生成的私钥文件默认使用的是 PKCS#1 标准。但是从 3.0 开始，默认为 PKCS#8 标准。
:::

如何区分生成的私钥是 PKCS#1 标准还是 PKCS#8 标准呢？只需要打开生成的私钥文件，看开头和结尾内容标识即可：

PKCS#1 标准文件内容开头和结尾标识：

```
-----BEGIN RSA PRIVATE KEY-----
.....
-----END RSA PRIVATE KEY-----
```

PKCS#8 标准文件内容开头和结尾标识：

```
-----BEGIN PRIVATE KEY-----
.....
-----END PRIVATE KEY-----
```

**示例：**

```bash
$ openssl genrsa -out private_key.pem 2048
```

命令执行完成之后就会看到在当前目录下多了一个 private_key.pem 私钥文件：

```bash
$ ls
private_key.pem
```

如果私钥文件内容以 “-----BEGIN RSA PRIVATE KEY-----” 开头，“-----END RSA PRIVATE KEY-----” 结尾，说明私钥是 PKCS#1 标准。

如果私钥文件内容以 “-----BEGIN PRIVATE KEY-----” 开头，“-----END PRIVATE KEY-----” 结尾，说明私钥是 PKCS#8 标准。

### 导出公钥（默认X.509格式）

从 rsa 私钥中提取公钥，命令如下：

```bash
$ openssl rsa -in private_key.pem -pubout -out public_key.pem
```

`private_key.pem` 就是之前生成的私钥的文件名（公钥生成规则是通过计算私钥数值）。`public_key.pem` 表示要导出的公钥的文件。

之后的就产生了对应的公钥文件 id_rsa_pub：

```bash
$ ls
private_key.pem  public_key.pem
```

### 私钥转 PKCS8 格式

PKCS#8 格式是一种更通用的私钥格式标准（如果你使用的是 Java、C## 开发语言就需要将私钥转换为 PKCS8 格式），相比 PKCS#1 更加通用，可以表示任意类型的私钥，不仅限于 RSA。

:::tip[特别说明]
如果你的 openssl 版本大于或等于 3.0，那么生成的私钥本身就是 PKCS#8 标准格式，无需再执行格式转换！
:::
命令如下：

```bash
$ openssl pkcs8 -topk8 -inform PEM -in private_key.pem -outform PEM -out private_key_pkcs8.pem [-nocrypt]
```

- `private_key_pkcs8.pem`：要输出的 PSCK#8 格式文件
- `-nocrypt`：用于指定不对 PKCS#8 文件内容加密（根据实际需要使用，不过通常都会加上该参数）。如果不指定该参数，那么 OpenSSL 会提示你输入一个密码来加密私钥。通常提示信息如下：

```bash
Enter Encryption Password:
```

现在除了私钥公钥之外，当前目录下还多了一个 PKCS8 格式私钥文件：

```bash
$ ls
private_key.pem  public_key.pem  private_key_pkcs8.pem
```

因为 PEM 格式内容本身就是 Base64 编码的 ASCII 文本。如果程序不想以文件的形式读取 private_key_pkcs8.pem 文件，而是通过字符串的形式使用，只需要删除文件首尾两行并去除换行即可。

## DER 和 PEM 格式区别

rsa 密匙对除了 PEM 格式之外，还有 DER 格式。简单地说，他们之间的区别只是内容形式不同。<u>DER 使用二进制编码，文件内容是原始的二进制数据。而 PEM 使用 Base64 编码，文件内容是 Base64 编码的文本。</u>另外：

|**格式**|**可读性**|**文件扩展名**|**应用场景**|
|:-------|:---------|:-------------|:-----------|
|DER|不可读，需要使用特定的工具才能查看内容|通常使用 .der 或 .cer 作为扩展名|常用于程序和系统内部使用，因为二进制更高效、更紧凑|
|PEM|可读，可以直接查看文件内容|通常使用 .pem 作为扩展名|常用于人工查看和编辑，因为它是 Base64 编码的 ASCII 字符，更易读|

:::danger[特别强调]
DER 是二进制格式数据，PEM 是 Base64 编码文本数据。
:::

## 格式转换

### PKCS#1 转 DER

```bash
openssl rsa -in private_key.pem -outform DER -out private_key.der
```

### PKCS#1 转 PKCS#8

```bash
openssl pkcs8 -topk8 -inform PEM -in private_key.pem -outform PEM -out private_key_pkcs8.pem [-nocrypt]
```

### PKCS#8 转 DER

```bash
openssl pkcs8 -topk8 -in private_key.pem -outform DER -out private_key_pkcs8.der [-nocrypt]
```

## 公钥为什么不需要做格式转换

公钥不需要像私钥那样转换格式的主要原因有以下几点：

<details open>
<summary>**公钥格式标准化**</summary>

公钥通常采用 X.509 标准。即以 “-----BEGIN PUBLIC KEY-----” 开头，“-----END PUBLIC KEY-----” 结尾的 PEM 格式。这已经成为公钥表示的事实标准。

相比私钥，公钥格式更加统一和简单，不需要像私钥那样有多种不同的表示方式。
</details>

<details open>
<summary>**公钥用途单一**</summary>

公钥主要用于加密数据和验证数字签名。它不像私钥那样需要用于解密或生成签名等多种操作。因此公钥的格式要求相对简单，无需像私钥那样有多种表示方式来适应不同的应用场景。
</details>

<details open>
<summary>**不涉及敏感信息**</summary>

公钥是公开的，不涉及任何敏感信息。因此在使用时不需要像私钥那样需要特殊的安全处理。相比之下，私钥包含了敏感的密钥材料，需要采取更加谨慎的措施进行保护和管理。
</details>

## 扩展

### 使用Java生成RSA密匙对

Java 程序生成的 RSA 密匙对私钥默认为 PKCS#8 格式，公钥则是 X.509 格式。具体的代码也很简单，直接上码：

```java
public static void main(String[] args) throws Exception {
    genKeyPair();
}

public static void genKeyPair() throws Exception {

    KeyPairGenerator keyPairGen = KeyPairGenerator.getInstance("RSA");

    keyPairGen.initialize(2048); // 密匙长度

    KeyPair keyPair = keyPairGen.generateKeyPair();

    RSAPrivateKey privateKey = (RSAPrivateKey) keyPair.getPrivate();
    RSAPublicKey publicKey = (RSAPublicKey) keyPair.getPublic();

    System.out.println("私钥格式:" + privateKey.getFormat()); // PKCS#8
    System.out.println("公钥格式:" + publicKey.getFormat());  // X.509

    System.out.println("私钥内容: \n" + encodeToString(privateKey.getEncoded()));
    System.out.println("公钥内容: \n" + encodeToString(publicKey.getEncoded()));
}

private static String encodeToString(byte[] encoded) {
    return Base64.getEncoder().encodeToString(encoded);
}

private static byte[] decodeToByte(String decoded) {
    return Base64.getDecoder().decode(decoded);
}
```

### 使用 Go 生成RSA密匙对

使用 Go 生成 rsa 密匙对需要使用 `golang.org/x/crypto` 密码库：

```bash
go install golang.org/x/crypto
```

相比较 Java，使用 Go 生成 rsa 密匙对就方便很多，而且将公钥和私钥转换为其他格式也特别简单，下面是示例：

```go
package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"os"
)

func main() {
	// 生成私钥
	privateKey, _ := rsa.GenerateKey(rand.Reader, 2048)

	// 输出 pkcs1 私钥
	pem.Encode(os.Stdout, &pem.Block{
		Type:    "RSA PRIVATE KEY",
		Headers: nil,
		Bytes:   x509.MarshalPKCS1PrivateKey(privateKey),
	})

	// 输出 pkcs8 私钥
	pkcs8Private, _ := x509.MarshalPKCS8PrivateKey(privateKey)
	pem.Encode(os.Stdout, &pem.Block{
		Type:    "PRIVATE KEY",
		Headers: nil,
		Bytes:   pkcs8Private,
	})

	// 输出 X.509 公钥
	x509Public, _ := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	pem.Encode(os.Stdout, &pem.Block{
		Type:    "PUBLIC KEY",
		Headers: nil,
		Bytes:   x509Public,
	})
}
```


## 参考资料

[https://www.cryptosys.net/pki/rsakeyformats.html](https://www.cryptosys.net/pki/rsakeyformats.html)

[https://stackoverflow.com/questions/10783366/how-to-generate-pkcs1-rsa-keys-in-pem-format](https://stackoverflow.com/questions/10783366/how-to-generate-pkcs1-rsa-keys-in-pem-format)
