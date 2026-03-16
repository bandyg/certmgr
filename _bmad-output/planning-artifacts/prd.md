---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-02b-vision", "step-02c-executive-summary", "step-03-success", "step-04-journeys", "step-05-domain", "step-06-innovation", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish"]
inputDocuments: ["_bmad-output/planning-artifacts/product-brief-cert-manager-2026-03-15.md", "_bmad-output/planning-artifacts/research/domain-grpc-mtls-certificate-management-2026-03-15.md", "_bmad-output/brainstorming/brainstorming-session-2026-03-15.md"]
workflowType: 'prd'
classification:
  projectType: "API 服务 / 后台服务"
  domain: "Fintech - 证书管理"
  complexity: "中等"
  projectContext: "绿线项目"
---

# Product Requirements Document - cert-manager

**Author:** BenCreative
**Date:** 2026-03-15

## Executive Summary

**cert-manager** 是一个部署在客户终端的证书管理服务，负责为本地 gRPC 服务提供 mTLS 证书，确保客户交易系统正常运行。该服务从 CA Server 自动获取 PFX 格式证书，解密提取 .crt 和 .key 文件，保存到本地存储，并在 gRPC 服务启动时提供证书加载。

**目标用户：** 使用交易系统的终端客户（交易员）
**核心问题：** 证书过期或更新失败将导致客户无法进行交易，直接影响交易员绩效和客户满意度

### What Makes This Special

- **完整生命周期管理**：集证书获取、解密、存储、更新、回退于一体
- **100% 可用性**：保证交易不中断是最优先目标
- **高可用设计**：Ping 检测 + 3次失败自动回退机制
- **可观测性**：提供状态 API 和版本列表 API
- **自动化**：每日自动检查和更新，无需人工干预

## Project Classification

| 项目 | 分类 |
|------|------|
| **Project Type** | API 服务 / 后台服务 |
| **Domain** | Fintech - 证书管理 |
| **Complexity** | 中等 |
| **Context** | 绿线项目 |

## Success Criteria

### User Success

- **交易系统正常运行**：mTLS 通信成功，客户可以正常进行交易
- **无感知体验**：服务在后台自动运行，无需用户干预
- **故障快速恢复**：出现问题时自动回退，减少交易中断时间

### Business Success

| 时间范围 | 目标 |
|----------|------|
| **上线时** | 100% 可用性，无交易中断 |
| **3 个月** | 稳定运行，无重大故障 |
| **12 个月** | 持续稳定，自动证书更新正常工作 |

### Technical Success

| KPI | 目标 | 测量方式 |
|-----|------|----------|
| **可用性** | 99.99% | 交易成功次数 / 总尝试次数 |
| **证书更新成功率** | 100% | 成功更新次数 / 总更新尝试 |
| **回退触发次数** | 越少越好 | 每月回退事件次数 |
| **故障恢复时间** | < 5 分钟 | 从检测到恢复的时间 |

### Measurable Outcomes

- 每日 9 点重启后 gRPC 服务正常加载证书
- Ping 失败 3 次后自动回退到上一版本
- 所有 REST API 响应正常

## Product Scope

### MVP - Minimum Viable Product

| 功能 | 描述 |
|------|------|
| REST API 下载证书 | 从 CA Server 获取 PFX 格式证书 |
| PFX 解密存储 | 提取 .crt 和 .key，保存到 /var/lib/certs/ |
| 每日定时检查 | 每日自动检查证书更新 |
| 手动更新 API | pushCert 端点触发立即更新 |
| 证书状态 API | 查询当前证书版本、到期时间 |
| 版本列表 API | 查看历史版本列表 |
| Ping 回退机制 | 失败 3 次自动回退到上一版本 |
| 每日重启 | 早上 9 点重启加载新证书 |

### Growth Features (Post-MVP)

暂不规划

### Vision (Future)

暂不规划 v2.0，MVP 即为最终版本

## User Journeys

### 1. Primary User - 交易员 (Trader)

**角色：** 使用交易系统的终端客户

**场景：** 后台服务，无直接交互

| 阶段 | 描述 |
|------|------|
| **日常运行** | cert-manager 在后台每日自动检查证书更新 |
| **成功时刻** | 交易正常进行，无感知 |
| **故障时刻** | 证书过期/更新失败 → 交易失败 → 收到投诉 |

**情感曲线：** 平静 → 无感知 → (故障时) 焦虑/沮丧

---

### 2. Operations User - 运维人员

**角色：** 负责监控和管理证书系统的运维工程师

**背景：** 负责确保交易系统稳定运行，需要能够查询证书状态和排查问题

**场景：**

| 阶段 | 描述 |
|------|------|
| **日常监控** | 通过状态 API 检查证书版本、到期时间 |
| **问题排查** | 证书更新失败时查看版本列表，回退到上一版本 |
| **手动触发** | 紧急情况下通过 pushCert 手动触发证书更新 |
| **故障恢复** | Ping 失败后检查系统，确认回退是否成功 |

**关键交互点：**
- GET /certs/status - 查询当前证书状态
- GET /certs/versions - 查看历史版本列表
- POST /certs/push - 手动触发证书更新

---

### Journey Requirements Summary

| 旅程 | 揭示的需求功能 |
|------|---------------|
| 交易员 (无感知) | 后台自动运行、每日检查、自动回退 |
| 运维人员 | 证书状态查询、版本列表、手动更新、监控告警 |

## Domain-Specific Requirements

### Compliance & Regulatory

- **审计日志**：记录所有证书操作（获取、解密、存储、更新、回退）
- **访问控制**：API 需要认证，确保只有授权用户可以访问

### Technical Constraints

- **高可用**：CA Server 4台，分两对部署在不同机房，任一机房故障时仍有备用
- **私钥保护**：文件权限 0600，普通用户不可访问
- **故障恢复**：Ping 失败 3 次自动回退到上一版本

### Integration Requirements

- CA Server：通过 REST API 获取 PFX 格式证书
- gRPC 服务：启动时加载证书文件进行 mTLS 通信
- 上层服务：提供 Ping API 用于健康检查

### Risk Mitigations

| 风险 | 缓解措施 |
|------|----------|
| CA Server 不可用 | 保留现有证书，继续使用旧版本 |
| PFX 解密失败 | Ping 检测 + 回退机制 |
| 每日重启中断 | 选择低峰期（早上9点）重启 |
| 磁盘空间不足 | metaData 保留所有版本（需监控） |

## API Backend Specific Requirements

### Project-Type Overview

cert-manager 是一个 REST API 后台服务，为客户终端提供证书管理功能。服务在后台自动运行，主要通过 API 与其他系统集成。

### Technical Architecture Considerations

| 组件 | 技术 |
|------|------|
| **运行时** | Node.js |
| **进程管理** | PM2 |
| **存储** | 本地 Linux 文件系统 (/var/lib/certs/) |

### API Specification

| Endpoint | Method | 描述 |
|----------|--------|------|
| `/certs` | GET | 从 CA Server 获取 PFX 并解压存储 |
| `/certs/push` | POST | 手动触发立即更新 |
| `/certs/status` | GET | 查询当前证书状态（版本、到期时间） |
| `/certs/versions` | GET | 查看历史版本列表 |

### Authentication

- **方式**: Bearer Token
- **实现**: Authorization header with Bearer token

### Data Formats

| 类型 | 格式 |
|------|------|
| **输入** | PFX (PKCS#12) |
| **输出** | .crt (X.509 证书), .key (私钥), ca-chain.crt (CA 证书链) |

### Error Codes

| 错误 | 描述 |
|------|------|
| 401 | 认证失败 |
| 500 | 服务器内部错误 |
| 502 | CA Server 不可用 |

### Implementation Considerations

- 每日 9 点定时重启
- Ping 失败 3 次自动回退
- 文件权限 0600 保护私钥

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP - 解决核心问题（证书管理）
**Resource Requirements:** Node.js + PM2 单服务部署

### MVP Feature Set (Phase 1)

根据产品简报，所有 8 个功能都在 MVP 范围内：

| 功能 | 描述 |
|------|------|
| REST API 下载证书 | 从 CA Server 获取 PFX 格式证书 |
| PFX 解密存储 | 提取 .crt 和 .key，保存到 /var/lib/certs/ |
| 每日定时检查 | 每日自动检查证书更新 |
| 手动更新 API | pushCert 端点触发立即更新 |
| 证书状态 API | 查询当前证书版本、到期时间 |
| 版本列表 API | 查看历史版本列表 |
| Ping 回退机制 | 失败 3 次自动回退到上一版本 |
| 每日重启 | 早上 9 点重启加载新证书 |

### Post-MVP Features

**Phase 2 (Post-MVP):** 暂不规划
**Phase 3 (Expansion):** 暂不规划

### Risk Mitigation Strategy

| 风险 | 缓解措施 |
|------|----------|
| **技术风险** | 使用成熟技术（Node.js, node-forge），简化实现 |
| **市场风险** | 解决明确的业务问题（保证交易不中断） |
| **资源风险** | 单服务部署，依赖少 |

## Functional Requirements

### 证书获取

- FR1: cert-manager 可以从 CA Server 获取 PFX 格式证书
- FR2: cert-manager 可以解密 PFX 文件提取 .crt 证书
- FR3: cert-manager 可以解密 PFX 文件提取 .key 私钥

### 证书存储

- FR4: cert-manager 可以将解密后的证书保存到 clientCerts/ 目录
- FR5: cert-manager 可以将解密后的私钥保存到 clientCerts/ 目录
- FR6: cert-manager 可以将 CA 证书链保存到 CACerts/ 目录
- FR7: cert-manager 可以将每个版本的证书备份到 metaData/ 目录

### 证书更新

- FR8: cert-manager 可以每日自动检查证书更新
- FR9: cert-manager 可以在检测到新证书时自动下载并存储
- FR10: gRPC 服务可以在启动时加载证书进行 mTLS 通信

### API 接口

- FR11: 运维人员可以调用 GET /certs 获取证书
- FR12: 运维人员可以调用 POST /certs/push 手动触发证书更新
- FR13: 运维人员可以调用 GET /certs/status 查询当前证书状态
- FR14: 运维人员可以调用 GET /certs/versions 查看历史版本列表
- FR15: API 需要 Bearer Token 认证

### 运维监控

- FR16: 上层服务可以调用 Ping API 检测证书是否有效
- FR17: cert-manager 可以在 Ping 失败 3 次后自动回退到上一版本

### 系统运维

- FR18: 系统每日 9 点自动重启并加载最新证书
- FR19: cert-manager 需要记录所有证书操作的审计日志

## Non-Functional Requirements

### Performance

- API 响应时间：< 2 秒
- 证书解密时间：< 1 秒
- 每日重启期间服务中断时间：< 5 分钟

### Security

- 私钥文件权限：0600（仅服务用户可读写）
- API 认证：Bearer Token
- 审计日志：记录所有证书操作
- CA 证书链验证：确保完整

### Scalability

- 支持 10-30 个客户端
- 每个客户端独立的证书存储

### Integration

- CA Server：REST API 获取 PFX 证书
- gRPC 服务：启动时加载证书文件
- 上层服务：Ping API 健康检查

### Reliability

- 可用性目标：99.99%
- 故障恢复时间：< 5 分钟
- 自动回退机制：Ping 失败 3 次自动回退