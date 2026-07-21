<figure>
<img width="1012" height="506" alt="image" src="https://github.com/user-attachments/assets/c647015e-6538-43de-8c26-6d6358c89729" />
<figcaption>
  <a href="https://unsplash.com/@luandmario?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Maria Lupan</a>의 사진, <a href="https://unsplash.com/photos/red-and-black-metal-tower-during-sunset-hy97yy3e03A?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
</figcaption>
</figure>

---
Rig은 코딩 에이전트를 위한 엄선된 호스트 독립형 도구 상자다. Tier 1은
어떤 저장소에도 마크다운만으로 된 워크플로를 설치한다. 하나의 공유
라우터, 항상 켜져 있는 Ponytail 구현 규칙, 그리고 의도, 설계, 실행,
TDD, 디버깅, 코드 리뷰를 위한 집중 스킬로 구성된다.

프로세스를 시작하지 않고, API 키가 필요 없으며, 의존성을 설치하지 않는다.

## Tier 1 설치

이 체크아웃에서:

```sh
sh rig/bootstrap.sh --target /path/to/repository
```

Tier 1은 현재 로컬 Rig 체크아웃에서 설치한다. foundational design에
설명된 고정 릴리스/git-ref 부트스트랩 경로는 아직 제공되지 않는다.

부트스트랩은 대화형으로 실행될 때 tier를 묻는다. 자동화에서는 같은 선택을
명시적으로 지정할 수 있다:

```sh
sh rig/bootstrap.sh --tier 1 --target /path/to/repository
```

선택한 호스트만 설치하려면 (Tier 2 materializer와 같은 게이팅):

```sh
sh rig/bootstrap.sh --tier 1 --target /path/to/repository --hosts antigravity,codex
# 또는: RIG_HOSTS=antigravity,codex sh rig/bootstrap.sh --tier 1 --target /path/to/repository
```

Tier 1은 다음 호스트 진입점에 같은 지시문 세트를 설치한다:

- Claude Code는 `.claude/skills/`에 프로젝트 스킬을 받고 `CLAUDE.md`에
  라우터 포인터를 받는다.
- Codex는 `.agents/skills/`에 네이티브 프로젝트 스킬을 받고 `AGENTS.md`에
  항상 켜져 있는 라우터 포인터를 받는다.
- Antigravity는 같은 `.agents/` 스킬/룰 트리를 함께 읽고, `GEMINI.md`
  (Antigravity 전용 오버라이드가 `AGENTS.md`보다 우선)와
  `.agents/workflows/`의 슬래시 커맨드 워크플로를 추가로 받는다.
- OpenCode, CodeWhale, Swival 및 그 밖의 `AGENTS.md` 리더는 루트 포인터를
  받는다.
- Gemini CLI는 `GEMINI.md` 포인터를 받는다.
- Cursor, Windsurf, Cline, GitHub Copilot, Kiro 및 `.agents/rules` 리더는
  각자의 네이티브 프로젝트 지시문 파일을 받는다.

모든 어댑터는 `.rig/routing.md`를 읽는다. Claude와 Codex는 호스트
디렉터리에서 같은 일곱 스킬도 네이티브로 발견한다. 기존 호스트 진입점은
보존된다.

그 네이티브 스킬 트리는 이 저장소의 `.claude/skills/`와
`.agents/skills/`에 커밋되어 있다. 부트스트랩은 이를 변경 없이 대상
저장소로 복사한다.

| 호스트 | 설치되는 진입점 |
|---|---|
| Claude Code | `CLAUDE.md`, `.claude/skills/rig-*/SKILL.md` |
| Cursor | `.cursor/rules/rig.mdc` |
| Windsurf | `.windsurf/rules/rig.md` |
| Cline | `.clinerules/rig.md` |
| GitHub Copilot editor/CLI | `.github/copilot-instructions.md`, `AGENTS.md` |
| Codex / VS Code Codex | `AGENTS.md`, `.agents/skills/rig-*/SKILL.md` |
| Gemini CLI | `GEMINI.md` |
| Antigravity | `AGENTS.md`, `GEMINI.md`, `.agents/rules/rig.md`, `.agents/skills/rig-*/SKILL.md`, `.agents/workflows/` |
| Kiro | `.kiro/steering/rig.md` |
| OpenCode, CodeWhale, Swival | `AGENTS.md` |
| 기타 에이전트 | 호스트가 `.rig/routing.md`를 읽도록 설정하거나, `rig/tier-1/adapters/pointer.md`의 한 줄 포인터를 프로젝트 지시문에 추가한다. |

### Hermes Agent

Hermes 네이티브 플러그인(`plugin.yaml`)으로 Rig을 설치한다. `pre_llm_call`로
활성 모드를 주입하고, `/rig` 모드 전환 명령을 등록하며, 스킬을
`rig:<skill>` 형식으로 노출한다.

## 큐레이션 축

| 단계 | Rig 소유자 |
|---|---|
| 의도와 인수 테스트 | Grilling |
| 제품 및 기술 설계 | Product design |
| 구현 | Ponytail |
| 실행과 병렬 처리 | Execution |
| TDD | Curated graft |
| 디버깅 | Curated graft |
| 코드 리뷰 | Curated graft |

큐레이션된 스킬은 워크플로 단계별로 자체 점검에 라벨을 붙인다. 소스 문서를
그냥 이어 붙이지 않고, 각 워크플로의 특징적인 부분을 합친다.

## Tier 1 경계

Tier 1은 기본적으로 고정 파일 목록만 가진 단순한 부트스트랩이다. sync engine,
runtime, keys, `.env` 처리가 없다. 선택적 `--hosts` / `RIG_HOSTS`는 Tier 2
payload 필터(`rig/lib/payload.js`)를 재사용해 좁은 설치가 materializer와
일치하게 한다. 플래그가 없으면 전체 고정 목록이 그대로 오라클이다. 공유
레이아웃은 예측 가능하므로, 향후 Tier 2가 설치된 형태를 바꾸지 않고도 이를
설명할 수 있다.

Tier 1은 마크다운만 제공하므로 워크플로는 권고 사항이다. Claude와 다른
hook 가능 호스트는 이후 tier에서 실제 도구 경계 강제를 제공할 수 있지만,
Cursor는 그럴 수 없다. Rig은 산문이 단단한 가드레일이라고 주장하지 않고
그 한계를 명시한다.

## 검증

```sh
npm run test:rig
```

테스트는 새 임시 저장소를 부트스트랩하고, 완전한 공유 payload, 모든 지시문
어댑터, 기존 호스트 파일 보존, 마크다운 전용 경계, secret placeholder의
부재를 확인한다.
