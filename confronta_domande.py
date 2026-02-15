#!/usr/bin/env python3
"""
Confronta domande duplicate tra file Excel.

Uso:
    python confronta_domande.py <cartella_con_file_excel> [--colonna NOME_COLONNA] [--soglia SOGLIA]

Esempi:
    python confronta_domande.py ./esami
    python confronta_domande.py ./esami --colonna "Domanda"
    python confronta_domande.py ./esami --soglia 85
"""

import argparse
import os
import sys
from collections import defaultdict
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz


def carica_file_excel(cartella: str) -> dict[str, pd.DataFrame]:
    """Carica tutti i file Excel (.xlsx, .xls) da una cartella."""
    cartella_path = Path(cartella)
    if not cartella_path.is_dir():
        print(f"Errore: '{cartella}' non e' una cartella valida.")
        sys.exit(1)

    file_excel = sorted(
        p for p in cartella_path.iterdir()
        if p.suffix.lower() in (".xlsx", ".xls") and not p.name.startswith("~")
    )

    if not file_excel:
        print(f"Nessun file Excel trovato in '{cartella}'.")
        sys.exit(1)

    print(f"Trovati {len(file_excel)} file Excel:\n")
    dati = {}
    for f in file_excel:
        try:
            df = pd.read_excel(f)
            dati[f.name] = df
            print(f"  - {f.name} ({len(df)} righe, colonne: {list(df.columns)})")
        except Exception as e:
            print(f"  - {f.name} [ERRORE: {e}]")

    print()
    return dati


def trova_colonna_domande(df: pd.DataFrame, nome_colonna: str | None) -> str | None:
    """Cerca la colonna che contiene le domande."""
    if nome_colonna and nome_colonna in df.columns:
        return nome_colonna

    # Cerca colonne con nomi comuni per domande
    nomi_comuni = [
        "domanda", "domande", "question", "questions",
        "testo", "text", "quesito", "quiz",
    ]
    for col in df.columns:
        if str(col).strip().lower() in nomi_comuni:
            return col

    # Se c'e' una sola colonna di testo, usa quella
    colonne_testo = [
        col for col in df.columns
        if df[col].dtype == "object"
    ]
    if len(colonne_testo) == 1:
        return colonne_testo[0]

    # Prendi la prima colonna di testo
    if colonne_testo:
        return colonne_testo[0]

    return None


def estrai_domande(dati: dict[str, pd.DataFrame], nome_colonna: str | None) -> dict[str, list[str]]:
    """Estrae le domande da ogni file Excel."""
    domande_per_file = {}

    for nome_file, df in dati.items():
        col = trova_colonna_domande(df, nome_colonna)
        if col is None:
            print(f"  Attenzione: nessuna colonna di testo trovata in '{nome_file}', saltato.")
            continue

        domande = (
            df[col]
            .dropna()
            .astype(str)
            .str.strip()
            .tolist()
        )
        # Filtra stringhe vuote
        domande = [d for d in domande if d and d.lower() != "nan"]
        domande_per_file[nome_file] = domande
        print(f"  {nome_file}: {len(domande)} domande estratte (colonna: '{col}')")

    print()
    return domande_per_file


def confronta_esatto(domande_per_file: dict[str, list[str]]) -> dict[str, list[str]]:
    """Trova domande identiche (confronto esatto, case-insensitive)."""
    # Mappa: domanda normalizzata -> lista di (file, domanda originale)
    indice = defaultdict(list)

    for nome_file, domande in domande_per_file.items():
        for domanda in domande:
            chiave = domanda.lower().strip()
            indice[chiave].append((nome_file, domanda))

    # Filtra solo le domande presenti in piu' di un file
    duplicati = {}
    for chiave, occorrenze in indice.items():
        file_unici = set(f for f, _ in occorrenze)
        if len(file_unici) > 1:
            duplicati[occorrenze[0][1]] = sorted(file_unici)

    return duplicati


def confronta_simili(
    domande_per_file: dict[str, list[str]], soglia: int = 85
) -> list[dict]:
    """Trova domande simili usando fuzzy matching."""
    # Raccogli tutte le domande con il file di origine
    tutte = []
    for nome_file, domande in domande_per_file.items():
        for domanda in domande:
            tutte.append((nome_file, domanda))

    simili = []
    visti = set()

    for i in range(len(tutte)):
        file_i, dom_i = tutte[i]
        gruppo = [(file_i, dom_i)]

        for j in range(i + 1, len(tutte)):
            file_j, dom_j = tutte[j]
            if file_i == file_j:
                continue
            if j in visti:
                continue

            punteggio = fuzz.token_sort_ratio(dom_i.lower(), dom_j.lower())
            if punteggio >= soglia:
                gruppo.append((file_j, dom_j))
                visti.add(j)

        if len(gruppo) > 1:
            file_unici = set(f for f, _ in gruppo)
            if len(file_unici) > 1:
                visti.add(i)
                simili.append({
                    "domande": gruppo,
                    "file": sorted(file_unici),
                    "num_file": len(file_unici),
                })

    # Ordina per numero di file (piu' ripetute prima)
    simili.sort(key=lambda x: x["num_file"], reverse=True)
    return simili


def stampa_risultati_esatti(duplicati: dict[str, list[str]]):
    """Stampa le domande duplicate identiche."""
    if not duplicati:
        print("Nessuna domanda identica trovata tra i file.\n")
        return

    # Ordina per numero di file
    ordinati = sorted(duplicati.items(), key=lambda x: len(x[1]), reverse=True)

    print(f"Trovate {len(ordinati)} domande identiche ripetute tra piu' file:\n")
    print("=" * 80)

    for idx, (domanda, file_list) in enumerate(ordinati, 1):
        testo = domanda if len(domanda) <= 120 else domanda[:117] + "..."
        print(f"\n  [{idx}] \"{testo}\"")
        print(f"      Presente in {len(file_list)} file:")
        for f in file_list:
            print(f"        - {f}")

    print("\n" + "=" * 80)


def stampa_risultati_simili(simili: list[dict]):
    """Stampa le domande simili raggruppate."""
    if not simili:
        print("Nessuna domanda simile trovata tra i file.\n")
        return

    print(f"Trovati {len(simili)} gruppi di domande simili tra piu' file:\n")
    print("=" * 80)

    for idx, gruppo in enumerate(simili, 1):
        print(f"\n  Gruppo [{idx}] - presente in {gruppo['num_file']} file:")
        for nome_file, domanda in gruppo["domande"]:
            testo = domanda if len(domanda) <= 100 else domanda[:97] + "..."
            print(f"    [{nome_file}]")
            print(f"      \"{testo}\"")

    print("\n" + "=" * 80)


def esporta_csv(duplicati: dict[str, list[str]], simili: list[dict], output: str):
    """Esporta i risultati in un file CSV."""
    righe = []

    for domanda, file_list in duplicati.items():
        righe.append({
            "tipo": "identica",
            "domanda": domanda,
            "file": " | ".join(file_list),
            "num_file": len(file_list),
        })

    for gruppo in simili:
        varianti = []
        for nome_file, domanda in gruppo["domande"]:
            varianti.append(f"[{nome_file}] {domanda}")
        # Salta se gia' trovata come identica
        righe.append({
            "tipo": "simile",
            "domanda": " /// ".join(varianti),
            "file": " | ".join(gruppo["file"]),
            "num_file": gruppo["num_file"],
        })

    df = pd.DataFrame(righe)
    df.to_csv(output, index=False, encoding="utf-8-sig")
    print(f"\nRisultati esportati in: {output}")


def main():
    parser = argparse.ArgumentParser(
        description="Confronta domande duplicate tra file Excel"
    )
    parser.add_argument(
        "cartella",
        help="Cartella contenente i file Excel da confrontare",
    )
    parser.add_argument(
        "--colonna",
        default=None,
        help="Nome della colonna che contiene le domande (auto-detect se omesso)",
    )
    parser.add_argument(
        "--soglia",
        type=int,
        default=85,
        help="Soglia di similarita' per il confronto fuzzy (0-100, default: 85)",
    )
    parser.add_argument(
        "--solo-esatte",
        action="store_true",
        help="Cerca solo corrispondenze esatte (piu' veloce)",
    )
    parser.add_argument(
        "--esporta",
        default=None,
        help="Esporta i risultati in un file CSV",
    )

    args = parser.parse_args()

    print("=" * 80)
    print("  CONFRONTO DOMANDE DUPLICATE TRA FILE EXCEL")
    print("=" * 80)
    print()

    # 1. Carica file
    print("--- Caricamento file ---")
    dati = carica_file_excel(args.cartella)

    # 2. Estrai domande
    print("--- Estrazione domande ---")
    domande_per_file = estrai_domande(dati, args.colonna)

    if not domande_per_file:
        print("Nessuna domanda estratta. Controlla i file e il nome della colonna.")
        sys.exit(1)

    totale = sum(len(d) for d in domande_per_file.values())
    print(f"Totale domande estratte: {totale} da {len(domande_per_file)} file\n")

    # 3. Confronto esatto
    print("--- Confronto esatto (domande identiche) ---")
    duplicati = confronta_esatto(domande_per_file)
    stampa_risultati_esatti(duplicati)

    # 4. Confronto simili (opzionale)
    simili = []
    if not args.solo_esatte:
        print(f"\n--- Confronto fuzzy (soglia: {args.soglia}%) ---")
        print("  (questo puo' richiedere tempo con molte domande...)\n")
        simili = confronta_simili(domande_per_file, args.soglia)
        stampa_risultati_simili(simili)

    # 5. Riepilogo
    print("\n--- RIEPILOGO ---")
    print(f"  File analizzati:        {len(domande_per_file)}")
    print(f"  Domande totali:         {totale}")
    print(f"  Domande identiche:      {len(duplicati)}")
    if not args.solo_esatte:
        print(f"  Gruppi simili:          {len(simili)}")
    print()

    # 6. Esporta CSV
    if args.esporta:
        esporta_csv(duplicati, simili, args.esporta)


if __name__ == "__main__":
    main()
