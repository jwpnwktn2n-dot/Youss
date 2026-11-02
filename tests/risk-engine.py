from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location("research",str(Path("scripts/research_desk.py").resolve()))
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
common={"symbol":"XXX","name":"Sample","price":100.0,"ret1m":2.0}
green=mod.analyze({**common,"pe":13,"volume":7000,"revenueCagr":20,"profitCagr":20})
assert green["riskBand"]=="lower" and green["riskScore"]>=73,green
amber=mod.analyze({**common,"pe":28,"volume":1400,"revenueCagr":3,"profitCagr":2})
assert amber["riskBand"]=="moderate" and amber["riskScore"]<=69,amber
red=mod.analyze({**common,"pe":85,"volume":50,"revenueCagr":-5,"profitCagr":-20})
assert red["riskBand"]=="high" and red["riskScore"]<=44,red
unknown=mod.analyze({"symbol":"ZZZ","name":"Unknown","price":None,"volume":None})
assert unknown["riskBand"]=="unknown" and unknown["riskScore"] is None,unknown
print("PASS: scores map to lower / moderate / high / unknown without calling stale or insufficient evidence safe")
