#!/usr/bin/env python3
"""Public-source Casablanca watch. No login, secrets or paid-price scraping."""
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import quote
from email.utils import parsedate_to_datetime
import json, logging, re, xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup

BASE=Path(__file__).resolve().parent.parent
DATA=BASE/"data"
UA={"User-Agent":"MyMoneyCasa/0.3 (+educational non-commercial research)"}
logging.basicConfig(level=logging.INFO,format="%(levelname)s %(message)s")

def read(name):
    return json.loads((DATA/name).read_text(encoding="utf-8"))
def save(name,obj):
    path=DATA/name
    text=json.dumps(obj,ensure_ascii=False,indent=2)+"\n"
    if path.read_text(encoding="utf-8")!=text:
        path.write_text(text,encoding="utf-8")
def request(url):
    r=requests.get(url,headers=UA,timeout=22)
    r.raise_for_status()
    if len(r.content)>4000000: raise ValueError("response too large")
    return r.text
def num(s):
    s=(s or "").replace("\u00a0"," ").replace("−","-")
    m=re.search(r"[-+]?\s*\d[\d\s,.]*",s)
    if not m:return None
    t=m.group().strip().replace(" ","")
    if "," in t and "." in t:
        t=t.replace(".","").replace(",",".") if t.rfind(",")>t.rfind(".") else t.replace(",","")
    elif "," in t:
        t=t.replace(",",".") if t.count(",")==1 and len(t.split(",")[-1])<=2 else t.replace(",","")
    try:return float(t)
    except ValueError:return None

def screener():
    soup=BeautifulSoup(request("https://casabourse.ma/screener/"),"html.parser")
    result=[]
    for table in soup.select("table"):
        head=" ".join(th.get_text(" ",strip=True).lower() for th in table.select("th"))
        if "performance" not in head or not ("entreprise" in head or "nom" in head):
            continue
        for tr in table.select("tr"):
            cells=tr.find_all("td",recursive=False)
            if len(cells)<15:continue
            fields=[c.get_text(" ",strip=True) for c in cells]
            symbols=re.findall(r"\b[A-Z][A-Z0-9]{1,4}\b",fields[0])
            if not symbols:continue
            symbol=symbols[-1]
            price,month=num(fields[3]),num(fields[5])
            if price is None or not 0<price<1000000 or month is None or not -100<=month<=1000:continue
            result.append(dict(symbol=symbol,name=fields[0].rsplit(symbol,1)[0].strip(" -") or symbol,
                sector=fields[2],price=price,ret1m=month,volume=num(fields[7]) or 0,
                pe=num(fields[8]),revenueCagr=num(fields[13]),profitCagr=num(fields[14])))
        break
    # Do not substitute a broken/partial scrape for the verified snapshot.
    unique={r["symbol"]:r for r in result}
    return list(unique.values()) if len(unique)>=30 else []

def rss(q,category):
    url="https://news.google.com/rss/search?q="+quote(q)+"&hl=fr&gl=MA&ceid=MA:fr"
    root=ET.fromstring(request(url))
    out=[]
    for node in root.findall(".//item")[:25]:
        title=(node.findtext("title") or "").strip()
        url=(node.findtext("link") or "").strip()
        pub=(node.findtext("pubDate") or "").strip()
        source=(node.findtext("source") or "Google News").strip()
        try:day=parsedate_to_datetime(pub).strftime("%Y-%m-%d")
        except (ValueError,TypeError):day=""
        if title and url.startswith("https://"):
            out.append(dict(title=title[:220],date=day,source=source[:80],category=category,url=url))
    return out

def main():
    today=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    market=read("market.json")
    try:
        rows=screener()
        if rows:
            market.update(stocks=rows,updated=today,mode="auto",
                scope="Parsed source rows; not guaranteed full exchange coverage")
            growth=sorted((s for s in rows if s["revenueCagr"] is not None and s["profitCagr"] is not None),
                key=lambda r:r["revenueCagr"],reverse=True)[:8]
            market["growth"]=[{k:s.get(k) for k in ("name","symbol","pe","revenueCagr","profitCagr")} for s in growth]
            logging.info("Updated %d stock records",len(rows))
        else:logging.warning("Stock-source format incomplete; keeping original dated data")
    except (requests.RequestException,ValueError) as exc:
        logging.warning("Price source unavailable: %s",exc)
    save("market.json",market)
    news=read("news.json")
    items=[]
    for query,cat in [("Bourse de Casablanca résultats sociétés cotées","company"),
                      ("AMMC introduction en bourse IPO Maroc","ipo"),
                      ("Bourse Casablanca acquisition augmentation capital","company")]:
        try:items+=rss(query,cat)
        except (requests.RequestException,ValueError,ET.ParseError) as exc:
            logging.warning("News feed unavailable: %s",exc)
    if items:
        old=news.get("articles",[])
        seen=set()
        merged=[]
        for item in sorted(items+old,key=lambda x:x.get("date",""),reverse=True):
            key=re.sub(r"\W","",item.get("title","").lower())[:110]
            if not key or key in seen:continue
            seen.add(key);merged.append(item)
        news.update(articles=merged[:45],updated=today,mode="auto")
        # Only a confirmed regulator notice belongs in the official IPO radar.
        logging.info("Refreshed %d news headlines",len(merged[:45]))
        save("news.json",news)
    else:logging.warning("No new source fetched; keeping old news with original date")
if __name__=="__main__":main()
