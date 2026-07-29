# Issue Tracker：GitHub

本仓库的 issue 和 PRD 位于 GitHub 仓库 `lofivo/lofiBoard`，统一使用 `gh` CLI 操作。首次操作前运行 `gh auth status` 确认登录账号和权限。

## 常用操作

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读取 issue**：`gh issue view <number> --comments`，同时获取标签，需要筛选评论时使用 `jq`。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，并按任务补充 `--label` 和 `--state`。
- **评论**：`gh issue comment <number> --body "..."`
- **增删标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

在仓库目录内运行时，`gh` 会根据 `git remote -v` 自动识别目标仓库。

## PR 是否参与分流

**PR 不是需求入口：no。** 外部需求只通过 issue 进入分流。

若以后把该值改为 `yes`，PR 使用与 issue 相同的标签和状态，并改用对应的 `gh pr` 命令：

- **读取 PR**：`gh pr view <number> --comments`，并用 `gh pr diff <number>` 查看差异。
- **列出待分流的外部 PR**：运行 `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的条目，排除 `OWNER`、`MEMBER` 和 `COLLABORATOR`。
- **评论、标签和关闭**：`gh pr comment`、`gh pr edit --add-label` / `--remove-label`、`gh pr close`。

GitHub 的 issue 和 PR 共用编号空间。遇到单独的 `#42` 时先运行 `gh pr view 42`，失败后再运行 `gh issue view 42`。

## 发布到 issue tracker

创建一个 GitHub issue。

## 获取相关 ticket

运行 `gh issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。**map** 是一个总 issue，**child** issue 是具体 ticket。

- **Map**：带 `wayfinder:map` 标签的单个 issue，正文维护 Notes / Decisions-so-far / Fog。创建命令：`gh issue create --label wayfinder:map`。
- **Child ticket**：通过 GitHub sub-issue API 关联到 map。若仓库未启用 sub-issue，则把 child 加入 map 正文的任务列表，并在 child 正文顶部写 `Part of #<map>`。标签使用 `wayfinder:<type>`，类型为 `research`、`prototype`、`grilling` 或 `task`；认领后分配给执行者。
- **阻塞关系**：以 GitHub 原生 issue dependency 为准。使用 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加，其中 `<blocker-db-id>` 是阻塞 issue 的数字 database id，可用 `gh api repos/<owner>/<repo>/issues/<n> --jq .id` 获取，不是 `#number` 或 `node_id`。若依赖功能不可用，在 child 正文顶部写 `Blocked by: #<n>, #<n>`；所有 blocker 关闭后 ticket 才算解除阻塞。
- **Frontier 查询**：按 map 顺序列出仍打开的 child，排除 `issue_dependencies_summary.blocked_by > 0`、`Blocked by` 中仍有开放 issue 或已有 assignee 的条目，取第一个可执行 ticket。
- **认领**：`gh issue edit <n> --add-assignee @me`，这是一次会话的首次写操作。
- **解决**：先运行 `gh issue comment <n> --body "<answer>"`，再运行 `gh issue close <n>`，最后把上下文指针（gist + 链接）追加到 map 的 Decisions-so-far。
