#!/usr/bin/env python3
"""Cautious Casablanca market screen using dated evidence, never an execution signal."""
from __future__ import annotations
from pathlib import Path
from datetime import datetime,timezone,date
import os,json,math,re,logging,requests
DATA=Path(__file__).resolve().parent.parent/"data"
NOW=datetime.now(timezone.utc)
logging.basicConfig(level=logging.INFO,format="%(levelname)s %(message)s")
def v(x):
    try:
        n=float(x)
        return n if math.isfinite(n) else None
    except (TypeError,ValueError):return None
def day(s):
    try:return date.fromisoformat(s)
    except (TypeError,ValueError):return None
def fmt(n):return f"{n:.1f}"
def analyze(s):
    price=v(s.get("price"));pe=v(s.get("pe"));vol=v(s.get("volume"))
    rev=v(s.get("revenueCagr"));profit=v(s.get("profitCagr"));mom=v(s.get("ret1m"))
    good=[];risk=[];parts={};score=50
    def measure(key,label,x,up,down,missing):
        nonlocal score
        if x is None:
            risk.append(missing);return
        n=up(x) if x>=0 else down(x)
        parts[key]=n;score+=n
        (good if n>0 else risk).append(label+" "+fmt(x))
    measure("revenue","Historical revenue growth (%)",rev,
            lambda x:15 if x>=15 else 8 if x>=5 else 0,lambda x:-12,"Revenue history unavailable")
    measure("profit","Historical earnings growth (%)",profit,
            lambda x:15 if x>=15 else 8 if x>=5 else 0,lambda x:-18,"Earnings history unavailable")
    if pe is None:risk.append("P/E unavailable")
    else:
        n=11 if 5<=pe<=22 else 3 if 22<pe<=35 else -18 if pe>50 or pe<=0 else -6 if 35<pe<=50 else 0
        parts["valuation"]=n;score+=n;(good if n>0 else risk).append("P/E "+fmt(pe)+" (sector comparison required)")
    if vol is None:risk.append("Reported trading volume missing")
    else:
        n=12 if vol>=5000 else 7 if vol>=1000 else -3 if vol>=200 else -16
        parts["liquidity"]=n;score+=n;(good if n>0 else risk).append("Reported trade volume "+str(round(vol)))
    if mom is not None:
        n=4 if 0<=mom<=12 else -9 if mom<-20 or mom>30 else 0
        parts["momentum"]=n;score+=n
        if n<0:risk.append("Extreme one-month move "+fmt(mom)+"%")
    if price is None or price<=0:risk.append("Usable price unavailable")
    completeness=sum(x is not None for x in [price,pe,vol,rev,profit,mom])
    critical=price is None or price<=0 or vol is not None and vol<200 or pe is not None and (pe<=0 or pe>50) or profit is not None and profit<0
    score=int(max(0,min(100,score)))
    if completeness<4 or price is None or price<=0:stance="Insufficient data"
    elif critical or score<48:stance="Caution"
    elif score>=73 and all(x is not None for x in [rev,profit,pe,vol]):stance="Research"
    else:stance="Watch"
    return {"symbol":str(s.get("symbol","")).upper()[:10],
      "name":str(s.get("name",""))[:100],"sector":str(s.get("sector",""))[:90],
      "stance":stance,"score":score,"coverage":completeness,"confidence":"Preliminary",
      "price":price,"ret1m":mom,"volume":vol,"pe":pe,"revenueCagr":rev,"profitCagr":profit,
      "scoreComponents":parts,"positiveFacts":good[:4],"riskFacts":risk[:5],
      "unknowns":["Audited financial statements","Debt and free cash flow",
                  "Dividends and corporate actions","Sector-relative valuation"]}
def relevance(h,s):
    title=str(h.get("title","")).lower()
    name=str(s.get("name","")).lower().strip()
    ticker=str(s.get("symbol","")).lower().strip()
    return (len(name)>=5 and re.search(r"(?<!\w)"+re.escape(name)+r"(?!\w)",title) is not None) or (
        len(ticker)>=3 and re.search(r"(?<!\w)"+re.escape(ticker)+r"(?!\w)",title) is not None)
def newsitem(x):
    if not isinstance(x,dict) or not str(x.get("url","")).startswith("https://"):return None
    return {k:str(x.get(k,""))[:n] for k,n in [("title",210),("date",10),("source",75),("url",1400),("category",24)]}
def report():
    market=json.loads((DATA/"market.json").read_text(encoding="utf-8"))
    news=json.loads((DATA/"news.json").read_text(encoding="utf-8"))
    rows=[analyze(x) for x in market.get("stocks",[]) if isinstance(x,dict)]
    stories=sorted((x for x in (newsitem(k) for k in news.get("articles",[])) if x),key=lambda x:x["date"],reverse=True)
    cutoff=NOW.date().toordinal()-30
    for row in rows:
        row["headlines"]=[x for x in stories if (day(x["date"]) and day(x["date"]).toordinal()>=cutoff and relevance(x,row))][:3]
    rows.sort(key=lambda x:(-x["score"],x["symbol"]))
    quoteDate=day(market.get("updated"))
    age=(NOW.date()-quoteDate).days if quoteDate else None
    if age is None or age>7:
        for row in rows:
            row["stance"]="Data stale"
            row["riskFacts"].insert(0,"Market dataset over 7 days old")
    return {
      "generatedAt":NOW.isoformat(timespec="seconds"),
      "marketUpdated":market.get("updated"),"newsUpdated":news.get("updated"),
      "marketSource":market.get("source","https://casabourse.ma/screener/"),
      "marketScope":market.get("scope","Tracked sample, not all listed equities"),
      "mode":"rules","llmActivated":False,"aiCommentary":None,
      "method":"Preliminary rules-based research screen; not a predictive model or trade execution",
      "methodNote":"Reported growth figures may cover different historical periods. P/E is not sector-adjusted, source prices may omit dividend adjustments, volume is indicative. Fundamental diligence requires audited filings, cash flow, debt, sector peers, and corporate-action history.",
      "criteria":["Historical revenue trend","Historical earnings trend","P/E (not sector adjusted)","Trading volume","1-month move (minor weight)"],
      "limits":["No complete adjusted 24-month returns","No verified debt or cash-flow data","Headline matching does not establish event impact"],
      "stocks":rows,"topHeadlines":stories[:15]}
def main():
    doc=report()
    optional_ai(doc)
    (DATA/"research.json").write_text(json.dumps(doc,ensure_ascii=False,indent=2,allow_nan=False)+"\n",encoding="utf-8")
    logging.info("Wrote research for %d equities; mode=%s",len(doc["stocks"]),doc["mode"])
if __name__=="__main__":main()
