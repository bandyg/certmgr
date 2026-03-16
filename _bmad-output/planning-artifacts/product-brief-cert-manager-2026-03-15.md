---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ["_bmad-output/brainstorming/brainstorming-session-2026-03-15.md", "_bmad-output/planning-artifacts/research/domain-grpc-mtls-certificate-management-2026-03-15.md"]
date: 2026-03-15
author: BenCreative
---

# Product Brief: cert-manager

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

cert-manager 是一个部署在客户终端的证书管理服务，负责为本地 gRPC 服务提供 mTLS 证书，确保客户交易系统正常运行。该服务从 CA Server 自动获取证书，解密存储，并提供给 gRPC 服务在启动时加载使用。

---

## Core Vision

### Problem Statement

客户终端的 gRPC 服务需要有效的 mTLS 证书才能与交易系统正常通信。证书过期或更新失败将导致客户无法进行交易，直接影响交易员的工作绩效和客户满意度。

### Problem Impact

| 影响方 | 影响描述 |
|--------|----------|
| **客户** | 无法进行交易，交易中断 |
| **交易员** | 被客户投诉，影响绩效 |
| **运维** | 需要手动干预紧急处理证书问题 |

### Why Existing Solutions Fall Short

- 现有 gRPC 服务已有自动更新，但新部署的 cert-manager 需要独立实现完整的证书生命周期管理
- 需要支持每日自动检查、手动触发更新、状态查询、版本历史等多种功能
- 需要在高可用和简单性之间取得平衡

### Proposed Solution

cert-manager 作为客户终端的独立服务，负责：
1. 从 CA Server 获取 PFX 格式证书
2. 解密提取 .crt 和 .key 文件，保存到本地存储
3. 每日定时检查并更新证书
4. 提供 REST API 供外部查询证书状态和手动触发更新
5. 支持故障时自动回退到上一个有效版本

### Key Differentiators

| 差异化点 | 说明 |
|----------|------|
| **完整生命周期** | 集获取、解密、存储、更新、回退于一体 |
| **高可用设计** | Ping 检测 + 3次失败自动回退 |
| **可观测性** | 提供状态 API、版本列表 API |
| **操作简单** | 每日自动运行，无需人工干预 |

---

## Party Mode 讨论总结

### 核心价值主张
**100% 可用性** - 保证交易不中断是最优先目标

### 高可用架构
- CA Server 共 4 台，分为两对部署在不同机房
- 任一机房故障时仍有备用 CA 可用
- 本地证书缓存 + 回退机制保证高可用

### 关键风险点（来自 QA 视角）
1. PFX 解密失败
2. 证书链不完整
3. 每日重启期间的服务中断
4. 回退机制本身失败

### 测试覆盖建议
- 获取证书路径
- 解密存储路径
- gRPC 服务加载路径
- Ping 回退路径

---

## Target Users

### Primary Users

**客户/交易员**

- **角色**: 使用交易系统的终端客户
- **交互方式**: 无需直接交互，cert-manager 在后台自动运行
- **价值感知**: 交易顺利时无感知，系统故障时被投诉
- **成功定义**: 交易不中断，系统稳定运行

### Secondary Users

无（产品为纯后台服务，无直接交互用户）

### User Journey

由于是后台服务，用户旅程相对简单：

| 阶段 | 描述 |
|------|------|
| **日常运行** | cert-manager 每日自动检查证书更新 |
| **成功时刻** | 交易正常进行，无感知 |
| **故障时刻** | 交易失败，收到投诉（反向感知） |

---

## Success Metrics

### User Success Metrics

| 指标 | 描述 |
|------|------|
| **核心成果** | 交易系统正常运行，mTLS 通信成功 |
| **成功时刻** | 每日重启后 gRPC 服务正常加载证书，交易顺利 |
| **失败表现** | 证书过期/更新失败 → 交易中断 → 投诉 |

### Business Objectives

| 时间范围 | 目标 |
|----------|------|
| **上线时** | 100% 可用性，无交易中断 |
| **3 个月** | 稳定运行，无重大故障 |
| **12 个月** | 持续稳定，自动证书更新正常工作 |

### Key Performance Indicators

| KPI | 目标 | 测量方式 |
|-----|------|----------|
| **可用性** | 99.99% | 交易成功次数 / 总尝试次数 |
| **证书更新成功率** | 100% | 成功更新次数 / 总更新尝试 |
| **回退触发次数** | 越少越好 | 每月回退事件次数 |
| **故障恢复时间** | < 5 分钟 | 从检测到恢复的时间 |

---

## MVP Scope

### Core Features (MVP 必需)

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **REST API 下载证书** | 从 CA Server 获取 PFX 格式证书 | 必须 |
| **PFX 解密存储** | 提取 .crt 和 .key，保存到 /var/lib/certs/ | 必须 |
| **每日定时检查** | 每日自动检查证书更新 | 必须 |
| **手动更新 API** | pushCert 端点触发立即更新 | 必须 |
| **证书状态 API** | 查询当前证书版本、到期时间 | 必须 |
| **版本列表 API** | 查看历史版本列表 | 必须 |
| **Ping 回退机制** | 失败 3 次自动回退到上一版本 | 必须 |
| **每日重启** | 早上 9 点重启加载新证书 | 必须 |

### Out of Scope for MVP

- 热更新（无需重启加载新证书）
- 多客户端支持
- 其他扩展功能
- v2.0 规划

### MVP Success Criteria

- 100% 可用性，无交易中断
- 证书更新成功率 100%
- 回退机制正常工作
- 所有 API 响应正常

### Future Vision

暂不规划 v2.0，MVP 即为最终版本