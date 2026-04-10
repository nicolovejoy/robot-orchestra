# RobotOrchestra

**A game where humans try to blend in with AI players.**

One human joins three AI participants responding to creative prompts. Players vote to identify who's human. Supports multi-human matches (2v2).

> 💤 **Mothballed as of 2026-04-09.** All AWS infrastructure has been destroyed via `terraform destroy`. Source code is preserved and the project can be resurrected at any time — see [CURRENT_STATUS.md](./CURRENT_STATUS.md) for the resurrection procedure.

## Architecture

```
Frontend → CloudFront → API Gateway → Lambda → DynamoDB
                              ↓
                        SQS Queue → Robot Worker → AWS Bedrock
```

## Quick Start

```bash
# Development
cd frontend && npm run dev

# Pre-deploy checks
npm run lint && npm run build  # frontend/
npm test                       # lambda/

# Deploy (user runs these)
./scripts/deploy-frontend.sh   # Frontend changes
./scripts/deploy-lambdas.sh    # Lambda changes
terraform apply                # Infrastructure
```

## Status

💤 **Mothballed** (2026-04-09). AWS resources destroyed. Code intact. See CURRENT_STATUS.md.

Last working state before mothball:

- Full game flow with voting, identity reveal, and match history
- User system foundation with persistent AI agents
- Multi-human matches (1v3 and 2v2) with invite codes
- Admin debug mode and CloudWatch dashboards
- Outstanding bugs: AI prompt generation fallback, no invite code input field, identity system hard-coded to 4 players

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Instructions for Claude AI assistant
- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - Detailed architecture and implementation status
- [ROADMAP.md](./ROADMAP.md) - Future development plans
- [NOMENCLATURE.md](./NOMENCLATURE.md) - Game terminology and data flow reference