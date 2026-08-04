<a id="kapitel-kunden"></a>

# Kunden

Der Bereich "Kunden" verwaltet die Haushalte (Kunden) der Tafel: Stammdaten, Familienmitglieder, Notizen, Dokumente sowie Sonderfälle wie Duplikate oder Kunden über dem Einkommenslimit.

## Kunden suchen

Unter **Kunden → Kunden suchen** kann nach Kundennummer, Nachname und/oder Vorname gesucht werden. Zusätzlich lässt sich nach "Daten unvollständig", "Unkostenbeitrag offen" und "Derzeit bezugsberechtigt" filtern.

![Kunden-Suche](images/kunden-suchen.jpg)

Das Suchergebnis zeigt eine Tabelle mit Kundennummer, Name, Geburtsdatum, Adresse, Personenanzahl, Ausstellungs- und Gültigkeitsdatum. Über die Aktionen kann der Kunde angesehen (Lupe) oder bearbeitet (Stift) werden.

![Suchergebnis](images/kunden-suchen-ergebnis.jpg)

## Kunden-Detail

Die Detailansicht eines Kunden zeigt alle Stammdaten des Hauptbeziehers sowie die zuletzt erfasste Notiz.

![Kunden-Detail](images/kunden-detail.jpg)

Am oberen Rand stehen folgende Aktionen zur Verfügung:

- **Daten ausdrucken**: Druck der Stammdaten oder nur des Kundenausweises.
- **Bezug verlängern**: Verlängert die Gültigkeit des Kunden um 1, 2, 3, 6 oder 12 Monate.
- **Unkostenbeitrag**: Zeigt bei offenem Unkostenbeitrag die Optionen "Alles bezahlt" oder "Betrag eintragen"; darüber hinaus kann der Betrag jederzeit manuell bearbeitet werden.
- **Kunde bearbeiten**: Öffnet die Bearbeitung der Stammdaten (siehe unten). Über den Pfeil daneben stehen zusätzlich **Kunde deaktivieren**, **Kunde sperren**/**entsperren** und **Kunde löschen** zur Verfügung.
- Ist gerade ein Ausgabetag aktiv, kann dem Kunden rechts oben eine **Ticketnummer** zugewiesen bzw. das zugewiesene Ticket wieder gelöscht werden.
- Über den grünen **+**-Button bei "Aktuellste Notiz" kann eine neue Notiz erfasst werden; bei mehreren Notizen können über **Alle Notizen anzeigen** alle bisherigen Notizen eingesehen werden.

Ein gesperrter Kunde wird zusätzlich mit einem roten Hinweisbanner (Sperrgrund, gesperrt von/am) angezeigt und die meisten Aktionen sind deaktiviert.

### Weitere Personen

Der Tab "Weitere Personen" listet alle zusätzlichen Haushaltsmitglieder (z. B. Kinder) mit Geburtsdatum, Nationalität, Arbeitgeber, Einkommen sowie den Angaben "Bezieht Familienbeihilfe" und "Im selben Haushalt".

![Weitere Personen](images/kunden-detail-weitere-personen.jpg)

### Dokumente

Der Tab "Dokumente" zeigt alle zum Kunden hochgeladenen Dokumente (z. B. Einkommensnachweise, Ausweiskopien) mit Dateiname, Dokumenttyp, Datum und Ersteller. Dokumente können heruntergeladen oder gelöscht werden.

Neue Dokumente können auf zwei Arten hochgeladen werden:

- **Datei hochladen**: Datei per Drag & Drop ablegen oder über **Datei auswählen** vom Gerät hochladen.
- **Scanner**: Auswahl einer bereits im Scanner-Ordner abgelegten Datei (z. B. von einem Netzwerkscanner/Multifunktionsgerät).

Vor dem Hochladen muss der **Dokumenttyp** ausgewählt werden.

![Dokumente](images/kunden-detail-dokumente.jpg)

## Kunden anlegen / bearbeiten

Beim Anlegen eines neuen Kunden werden die Daten des Hauptbeziehers (Name, Geburtsdatum, Geschlecht, Nationalität, Kontakt, Adresse, Arbeitgeber, Einkommen) sowie optional weitere Personen im Haushalt erfasst.

![Kunde anlegen](images/kunden-anlegen.jpg)

Die Bearbeitungsmaske eines bestehenden Kunden zeigt zusätzlich die bereits erfassten weiteren Personen inklusive der Möglichkeit, einzelne Personen zu entfernen (**Löschen**) oder neue hinzuzufügen (**Hinzufügen**).

![Kunde bearbeiten](images/kunden-bearbeiten.jpg)

## Kunden-Duplikate

Unter **Kunden → Kunden-Duplikate** erkennt das System potenzielle doppelt angelegte Kunden (z. B. durch ähnliche Adressen oder Namen) und zeigt sie paarweise gegenüber.

![Kunden-Duplikate](images/kunden-duplikate.jpg)

Für jedes gefundene Duplikat-Paar stehen folgende Aktionen zur Verfügung:

- **Kunden zusammenführen** (grüner Haken): Öffnet den Datenabgleich zur Zusammenführung.
- **Kunden-Details ansehen** (Lupe): Wechselt zur Detailansicht des jeweiligen Kunden.
- **Kunden löschen** (Papierkorb): Löscht ausschließlich den ausgewählten Kunden, der andere bleibt bestehen.

### Kunden zusammenführen

Beim Zusammenführen bleibt der als Ziel gewählte Kunde bestehen, die übrigen werden nach der Zusammenführung gelöscht. Für Felder, die sich zwischen den Kunden unterscheiden (z. B. Adresse, Vorname), kann ausgewählt werden, welcher Wert übernommen wird. Personen, die nur beim zusammenzuführenden Kunden vorhanden sind, werden automatisch übernommen.

![Kunden zusammenführen](images/kunden-zusammenfuehren.jpg)

<a id="kunden-über-limit"></a>

## Kunden über Limit

Unter **Kunden → Kunden über Limit** werden alle Kunden aufgelistet, deren Gesamteinkommen aktuell über dem für ihre Haushaltsgröße gültigen Limit liegt (siehe [Grenzwerte](einstellungen.md#statische-werte-grenzwerte)). Angezeigt werden u. a. das Gesamteinkommen, das gültige Limit und die Differenz ("Über Limit").

![Kunden über Limit](images/kunden-ueber-limit.jpg)
