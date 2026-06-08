"""Create links between GBrain pages to improve brain score."""
import json, http.client, yaml, time

with open(r'C:\Users\juana\AppData\Local\hermes\config.yaml') as f:
    config = yaml.safe_load(f)
headers_raw = config['mcp_servers']['gbrain']['headers']
headers = json.loads(headers_raw) if isinstance(headers_raw, str) else headers_raw
token = headers['Authorization']

def gbrain(method, params):
    conn = http.client.HTTPConnection('localhost', 4242)
    payload = json.dumps({"jsonrpc":"2.0","method":"tools/call","params":{"name":method,"arguments":params},"id":1})
    req_headers = {'Content-Type':'application/json','Accept':'application/json, text/event-stream','Authorization':token}
    conn.request('POST','/mcp',payload,req_headers)
    resp = conn.getresponse()
    body = resp.read().decode()
    conn.close()
    for line in body.split('\n'):
        if line.startswith('data: '):
            inner = json.loads(line[6:])
            if inner.get('result',{}).get('isError'):
                print(f"  ERROR: {inner['result']['content'][0]['text'][:150]}")
                return None
            text = inner['result']['content'][0]['text']
            return json.loads(text) if text.strip() else None
    print(f"  RAW: {body[:200]}")
    return None

links = [
    # Project pages → domain pages
    ("project_stoqio_status", "project_stoqio_tech_debt", "references"),
    ("project_stoqio_status", "nfe-provider-comparison", "references"),
    ("project_stoqio_status", "nfe-market-benchmark", "references"),
    ("project_stoqio_status", "lessons_learned", "references"),
    ("project_stoqio_status", "diferencial_agente_fiscal", "references"),
    ("project_qts_bamn_bot", "lessons_learned", "references"),
    ("project_stoqio_tech_debt", "lessons_learned", "references"),
    ("nfe-provider-comparison", "nfe-market-benchmark", "related"),
    ("diferencial_agente_fiscal", "project_stoqio_status", "implements"),
    
    # Link to existing superpowers sessions
    ("project_stoqio_status", "superpowers/specs/2026-05-30-precificacao-onboarding-design", "references"),
    ("project_stoqio_status", "superpowers/specs/2026-05-30-painel-admin-design", "references"),
    ("project_stoqio_status", "superpowers/specs/2026-05-30-distribuicao-afiliados-ia-design", "references"),
    ("project_stoqio_status", "superpowers/plans/2026-05-30-plano-e3-checkout-mp", "references"),
    ("nfe-provider-comparison", "sessao-2026-06-05-stoqio-billing", "references"),
]

for from_slug, to_slug, link_type in links:
    time.sleep(0.5)
    result = gbrain('add_link', {'from': from_slug, 'to': to_slug, 'link_type': link_type})
    status = "OK" if result and result.get('status') == 'ok' else f"FAIL: {result}"
    print(f"{from_slug} → {to_slug} [{link_type}]: {status}")

print("\nDone! Check brain score with get_health.")
