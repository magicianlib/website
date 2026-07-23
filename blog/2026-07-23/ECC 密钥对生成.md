---
slug: ECC 密钥对生成
title: ECC 密钥对生成
date: 2026-07-23T14:30
tags: [加密]
---

## 简介

ECC（椭圆曲线密码）密钥对的生成方式和 RSA 不同——不是指定密钥长度，而是**选一条命名曲线**。没有特殊需求一律用 NIST P-256（OpenSSL 里叫 `prime256v1`，别名 `secp256r1`）。概念与 RSA/ECC 的选型对比见[《非对称加密算法与应用场景》](/blog/非对称加密算法与应用场景/)，RSA 密钥对生成见[《Rsa 密匙对生成》](/blog/Rsa%20密匙对生成/)。

<!-- truncate -->

## OpenSSL 生成 ECDSA 密钥对

### 生成私钥

经典写法（`ecparam`，输出 SEC1 格式）：

```bash
$ openssl ecparam -genkey -name prime256v1 -noout -out ec_private.pem
```

- `-name prime256v1`：指定曲线，即 NIST P-256。
- `-noout`：不输出 `EC PARAMETERS` 块，文件里只留干净的 `EC PRIVATE KEY`。

OpenSSL 3.0+ 推荐用 `genpkey`，直接生成 PKCS#8 格式：

```bash
$ openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out ec_private.pem
```

查看所有可用曲线：

```bash
$ openssl ecparam -list_curves
```

### 导出公钥

从私钥提取公钥（SEC1 或 PKCS#8 私钥都适用），输出 X.509/SPKI 格式：

```bash
$ openssl ec -in ec_private.pem -pubout -out ec_public.pem
```

## 曲线选择

| 曲线（OpenSSL 名） | 别名 | 安全强度 | 用途 |
| :--- | :--- | :--- | :--- |
| prime256v1 | P-256 / secp256r1 | ≈128-bit | 通用首选，TLS、JWT 签名默认 |
| secp384r1 | P-384 | ≈192-bit | 更高安全要求 |
| secp256k1 | — | ≈128-bit | 区块链（比特币、以太坊） |

`secp256k1` 是 Koblitz 曲线，参数来源与 NIST 曲线不同，主要用于加密货币，除非对接区块链否则不用。

## 私钥格式：SEC1 与 PKCS#8

EC 私钥有两种表示，看文件头尾区分。

SEC1（`ecparam` 默认输出）：

```
-----BEGIN EC PRIVATE KEY-----
.....
-----END EC PRIVATE KEY-----
```

PKCS#8（`genpkey` 默认输出，Java、Go 默认也用这个）：

```
-----BEGIN PRIVATE KEY-----
.....
-----END PRIVATE KEY-----
```

SEC1 转 PKCS#8：

```bash
$ openssl pkcs8 -topk8 -in ec_private.pem -nocrypt -out ec_private_pkcs8.pem
```

公钥始终是 X.509/SPKI（`-----BEGIN PUBLIC KEY-----`），不存在多套格式，无需转换。PEM 与 DER 的区别和 RSA 一致：PEM 是 Base64 文本，DER 是二进制，各命令加 `-outform DER` 即输出二进制。

## Java 生成 EC 密钥对

Java 默认私钥 PKCS#8、公钥 X.509，与 RSA 一致。按命名曲线初始化：

```java
KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
kpg.initialize(new ECGenParameterSpec("secp256r1")); // P-256
KeyPair keyPair = kpg.generateKeyPair();

ECPrivateKey privateKey = (ECPrivateKey) keyPair.getPrivate();
ECPublicKey publicKey = (ECPublicKey) keyPair.getPublic();

System.out.println("私钥格式:" + privateKey.getFormat()); // PKCS#8
System.out.println("公钥格式:" + publicKey.getFormat());  // X.509
System.out.println("私钥内容:\n" + Base64.getEncoder().encodeToString(privateKey.getEncoded()));
System.out.println("公钥内容:\n" + Base64.getEncoder().encodeToString(publicKey.getEncoded()));
```

曲线名用 `secp256r1`（SunEC 接受的标准名）。需要导入 `java.security.*`、`java.security.spec.ECGenParameterSpec`、`java.util.Base64`。

## Go 生成 EC 密钥对

```go
package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"os"
)

func main() {
	privateKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)

	// SEC1 私钥
	sec1, _ := x509.MarshalECPrivateKey(privateKey)
	pem.Encode(os.Stdout, &pem.Block{Type: "EC PRIVATE KEY", Bytes: sec1})

	// PKCS#8 私钥
	pkcs8, _ := x509.MarshalPKCS8PrivateKey(privateKey)
	pem.Encode(os.Stdout, &pem.Block{Type: "PRIVATE KEY", Bytes: pkcs8})

	// X.509 公钥
	pub, _ := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	pem.Encode(os.Stdout, &pem.Block{Type: "PUBLIC KEY", Bytes: pub})
}
```

`elliptic.P256()` 即 NIST P-256。
