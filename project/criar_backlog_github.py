import json
import subprocess
import sys
from pathlib import Path

GH = r"C:\Program Files\GitHub CLI\gh.exe"
OWNER = "LeonardoTironi"
HERE = Path(__file__).parent
STATE = HERE / "project_state.json"


def gh(*args: str, parse: bool = False):
    result = subprocess.run([GH, *args], capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        sys.exit(f"gh {' '.join(args[:3])} falhou:\n{result.stderr}")
    return json.loads(result.stdout) if parse else result.stdout.strip()


def graphql(query: str, **variables):
    args = ["api", "graphql", "-f", f"query={query}"]
    for key, value in variables.items():
        args += ["-f", f"{key}={value}"]
    return gh(*args, parse=True)


def fields(number: int) -> dict:
    data = gh("project", "field-list", str(number), "--owner", OWNER, "--format", "json", parse=True)
    return {f["name"]: f for f in data["fields"]}


def setup() -> dict:
    project = gh("project", "create", "--owner", OWNER, "--title", "Scouter Power",
                 "--format", "json", parse=True)
    number, project_id = project["number"], project["id"]
    gh("project", "edit", str(number), "--owner", OWNER, "--description",
       "Backlog e acompanhamento das sprints do Scouter Power (Scrum: preparação + 2 sprints).")
    for repo in ("power_backend", "power_frontend"):
        gh("project", "link", str(number), "--owner", OWNER, "--repo", f"{OWNER}/{repo}")

    for name, options in {
        "Sprint": "Preparação,Sprint 1,Sprint 2",
        "Prioridade": "Essencial,Importante,Desejável,Condição obrigatória",
        "Responsável": "Leonardo,Marcelo,Luiz Gustavo",
    }.items():
        gh("project", "field-create", str(number), "--owner", OWNER, "--name", name,
           "--data-type", "SINGLE_SELECT", "--single-select-options", options)

    status_id = fields(number)["Status"]["id"]
    graphql(
        """mutation($id: ID!) { updateProjectV2Field(input: {fieldId: $id, singleSelectOptions: [
          {name: "A fazer", color: GRAY, description: "Ainda não iniciado"},
          {name: "Em andamento", color: YELLOW, description: "Sendo desenvolvido"},
          {name: "Em revisão", color: BLUE, description: "Aguardando revisão ou testes"},
          {name: "Concluído", color: GREEN, description: "Critério de aceite atendido"}
        ]}) { projectV2Field { ... on ProjectV2SingleSelectField { id } } } }""",
        id=status_id,
    )
    state = {"number": number, "id": project_id, "url": project["url"], "done": []}
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    return state


def main() -> None:
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else setup()
    number, project_id = state["number"], state["id"]
    all_fields = fields(number)

    def option(field: str, name: str) -> tuple[str, str]:
        f = all_fields[field]
        return f["id"], next(o["id"] for o in f["options"] if o["name"] == name)

    backlog = json.loads((HERE / "backlog.json").read_text(encoding="utf-8"))
    for item in backlog:
        if item["title"] in state["done"]:
            continue
        args = ["issue", "create", "--repo", f"{OWNER}/{item['repo']}",
                "--title", item["title"], "--body", item["body"]]
        if item.get("assignee"):
            args += ["--assignee", OWNER]
        url = gh(*args).splitlines()[-1]
        added = gh("project", "item-add", str(number), "--owner", OWNER, "--url", url,
                   "--format", "json", parse=True)
        for field, value in (("Status", item["status"]), ("Sprint", item["sprint"]),
                             ("Prioridade", item["prioridade"]),
                             ("Responsável", item["responsavel"])):
            field_id, option_id = option(field, value)
            gh("project", "item-edit", "--id", added["id"], "--project-id", project_id,
               "--field-id", field_id, "--single-select-option-id", option_id)
        if item.get("close"):
            gh("issue", "close", url, "--reason", "completed")
        state["done"].append(item["title"])
        STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"ok  {url}  {item['title']}")

    print(f"\nProjeto: {state['url']}")


if __name__ == "__main__":
    main()
