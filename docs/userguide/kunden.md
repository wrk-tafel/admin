<a id="kapitel-kunden"></a>

# Kunden

Der Bereich "Kunden" verwaltet die Haushalte (Kunden) der Tafel: Stammdaten, Familienmitglieder, Notizen, Dokumente sowie Sonderfälle wie Duplikate oder Kunden über dem Einkommenslimit.

## Kunden suchen

Unter **Kunden → Kunden suchen** kann entweder direkt über die **Kundennummer** (Feld oben, Button **Anzeigen**) zur Detailansicht gesprungen werden, oder über das Feld **Suche** gesucht werden. Ist zur eingegebenen Kundennummer kein Kunde vorhanden, erscheint die Meldung "Kunde nicht gefunden!".

Das Suchfeld durchsucht alles, woran ein Haushalt erkennbar ist: Kundennummer, die Namen **aller** Personen des Haushalts (nicht nur der Hauptperson), Adresse, Telefonnummer und E-Mail-Adresse. Es genügt ein Teil davon – die Eingabe muss nicht vollständig sein und auch nicht am Wortanfang stehen. Tippfehler werden toleriert: Wird "Mustermsnn" statt "Mustermann" eingegeben, wird der Kunde trotzdem gefunden. Genaue Treffer stehen im Ergebnis immer oben, ähnliche darunter.

Zusätzlich lässt sich nach "Daten unvollständig", "Unkostenbeitrag offen" und "Derzeit bezugsberechtigt" filtern; die Filter können auch ohne Sucheingabe verwendet werden. Das Info-Symbol (ⓘ) neben dem Suchfeld und neben jedem Filter erklärt, wonach genau gesucht wird – "Daten unvollständig" findet z. B. Kunden, bei denen bei einer Person Pflichtangaben fehlen.

![Kunden-Suche](images/kunden-suchen.jpg)

Beim Öffnen der Seite werden bereits die ersten Kunden angezeigt – man muss also nicht erst suchen, um überhaupt etwas zu sehen. Ein Suchbegriff oder ein Filter grenzt diese Liste dann ein.

Das Suchergebnis zeigt eine Tabelle mit Kundennummer, Name, Geburtsdatum, Adresse, Personenanzahl, Ausstellungs- und Gültigkeitsdatum. Über die Aktionen kann der Kunde angesehen (Lupe) oder bearbeitet (Stift) werden. Bei vielen Treffern kann über die Seitennavigation unterhalb der Ergebnisliste geblättert und die Anzahl der Elemente pro Seite angepasst werden.

![Suchergebnis](images/kunden-suchen-ergebnis.jpg)

Auf schmalen Bildschirmen wird das Suchergebnis statt als Tabelle als Kartenliste dargestellt – eine Karte je Kunde mit denselben Angaben und denselben Aktionen (siehe [Darstellung auf schmalen Bildschirmen](README.md#darstellung-auf-schmalen-bildschirmen)):

![Suchergebnis auf schmalen Bildschirmen](images/kunden-suchen-ergebnis-mobil.jpg)

## Kunden-Detail

Die Detailansicht eines Kunden zeigt alle Stammdaten des Hauptbeziehers sowie die zuletzt erfasste Notiz.

![Kunden-Detail](images/kunden-detail.jpg)

Am oberen Rand stehen folgende Aktionen zur Verfügung:

- **Daten ausdrucken**: Druck der Stammdaten oder nur des Kundenausweises.
- **Bezug verlängern**: Verlängert die Gültigkeit des Kunden um 1, 2, 3, 6 oder 12 Monate.
- **Unkostenbeitrag**: Ist noch ein Betrag offen, stehen "Alles bezahlt" und "Betrag eintragen" zur Verfügung; unabhängig davon kann über "Betrag bearbeiten" (unterhalb einer Trennlinie) der Betrag jederzeit manuell korrigiert werden.
- **Kunde bearbeiten**: Öffnet die Bearbeitung der Stammdaten (siehe unten). Über den Pfeil daneben stehen zusätzlich **Kunde deaktivieren**, **Kunde sperren**/**entsperren** und **Kunde löschen** zur Verfügung (jeweils mit Sicherheitsabfrage).
- Ist gerade ein Ausgabetag aktiv, kann dem Kunden rechts oben eine **Ticketnummer** zugewiesen werden; ist bereits ein Ticket zugewiesen, wird es stattdessen angezeigt und kann über den Papierkorb-Button wieder entfernt werden.
- Über den grünen **+**-Button bei "Aktuellste Notiz" kann eine neue Notiz erfasst werden; bei mehreren Notizen können über **Alle Notizen anzeigen** alle bisherigen Notizen eingesehen werden.

Beim **Sperren** eines Kunden muss ein **Sperrgrund** angegeben werden. Ein gesperrter Kunde wird danach mit einem roten Hinweisbanner ("Kunde ist gesperrt!", Zeitpunkt und Benutzer der Sperrung sowie der Sperrgrund) angezeigt, und die meisten Aktionen sind deaktiviert.

![Kunde gesperrt](images/kunden-gesperrt.jpg)

Wurde bei einem Kunden zwischenzeitlich von anderer Stelle etwas geändert (z. B. gleichzeitige Bearbeitung durch eine zweite Person), zeigt die Anwendung vor dem Speichern eine Bestätigungsabfrage mit der Konflikt-Meldung an, bevor die eigene Änderung trotzdem übernommen wird.

### Weitere Personen

Der Tab "Weitere Personen" listet alle zusätzlichen Haushaltsmitglieder (z. B. Kinder) mit Geburtsdatum, Nationalität, Arbeitgeber, Einkommen sowie den Angaben "Bezieht Familienbeihilfe" und "Im selben Haushalt". Personen, die als "Nicht im selben Haushalt" markiert sind, bleiben bei der Berechnung vollständig außen vor – weder ihr Einkommen noch ihre Familienbeihilfe zählen mit, und sie erhöhen weder Haushaltsgröße noch Einkommenslimit.

![Weitere Personen](images/kunden-detail-weitere-personen.jpg)

### Dokumente

Der Tab "Dokumente" zeigt alle zum Kunden hochgeladenen Dokumente (z. B. Einkommensnachweise, Ausweiskopien) mit Dateiname, Dokumenttyp, Datum und Ersteller. Dokumente können heruntergeladen oder gelöscht werden (jeweils mit Sicherheitsabfrage).

Neue Dokumente können über die Quelle-Auswahl auf zwei Arten hochgeladen werden:

- **Datei hochladen**: Datei per Drag & Drop ablegen oder über **Datei auswählen** vom Gerät hochladen.
- **Scanner**: Auswahl einer bereits im Scanner-Ordner abgelegten Datei (z. B. von einem Netzwerkscanner/Multifunktionsgerät). Die Liste der verfügbaren Dateien aktualisiert sich automatisch, sobald neue Dateien im Scanner-Ordner abgelegt werden; über das Vorschau-Symbol (Auge) kann eine Datei vor dem Hochladen angesehen werden.

Der Scanner-Ordner ist optional: Ist er für die aktuelle Installation nicht eingerichtet oder deaktiviert, wird die Quelle-Auswahl gar nicht angezeigt und Dokumente werden ausschließlich vom Gerät hochgeladen. Die Administration kann den Scanner-Ordner auch im laufenden Betrieb ein- oder ausschalten: Die Quelle-Auswahl erscheint bzw. verschwindet dann von selbst, ohne dass die Seite neu geladen werden muss. War gerade **Scanner** ausgewählt, wird automatisch auf **Datei hochladen** zurückgeschaltet.

Vor dem Hochladen muss der **Dokumenttyp** ausgewählt werden.

![Dokumente](images/kunden-detail-dokumente.jpg)

### Verlauf

Der Tab "Verlauf" zeigt jede erfasste Änderung an diesem Kunden, seinen weiteren Personen, seinen Notizen und seinen Dokumenten – jeweils mit Zeitpunkt, dem Benutzer, der sie vorgenommen hat, und den Werten davor und danach. Damit lässt sich nachvollziehen, wer z. B. die Adresse korrigiert, das Einkommen angepasst oder den Kunden gesperrt hat.

Der Tab wird nur angezeigt, wenn die Berechtigung **Änderungsprotokoll** vorhanden ist. Dieselben Einträge – gemeinsam mit jenen zu Benutzern und Einstellungen – finden sich im [Änderungsprotokoll](aenderungsprotokoll.md), dort zusätzlich filterbar.

![Verlauf](images/kunden-verlauf.jpg)

## Kunden anlegen / bearbeiten

Beim Anlegen eines neuen Kunden werden die Daten des Hauptbeziehers (Name, Geburtsdatum, Geschlecht, Nationalität, Kontakt, Adresse, Arbeitgeber, Einkommen) sowie optional weitere Personen im Haushalt erfasst. Nachname, Vorname, Telefonnummer, Adresse und Arbeitgeber sind Pflichtfelder; die PLZ muss eine 4-stellige Zahl sein (das Feld weist mit "4-stellig" darauf hin), die Telefonnummer darf nur Ziffern enthalten. Wird beim Einkommen ein Datum "nachgewiesen bis" eingetragen, schlägt das Formular "Gültig bis" automatisch mit diesem Datum zzgl. 2 Monaten vor. Neben dem Datumsfeld "Gültig bis" stehen Schnellauswahl-Buttons (+1/+2/+3/+6/+12 Monate) zur Verfügung, die ausgehend vom aktuell eingetragenen Datum (oder, falls noch keines gesetzt ist, ab heute) weiterrechnen – dieselbe Schnellauswahl wie beim "Bezug verlängern" in der Kunden-Detailansicht.

Die fachlich weniger selbsterklärenden Felder tragen ein Info-Symbol (ⓘ), das ihre Wirkung erklärt (siehe [Kurzhinweise](README.md#tooltips-und-erklaerungen)):

- **Einkommen (monatl.)**: Die Einkommen aller Personen im Haushalt werden zusammengezählt und gegen die Einkommensgrenze geprüft.
- **nachgewiesen bis**: Datum, bis zu dem der vorgelegte Einkommensnachweis gültig ist.
- **Alleinerzieher**: Wird nur für die Statistik erfasst und beeinflusst die Einkommensgrenze nicht.
- **Gültig bis**: Ende der Bezugsberechtigung; danach wird der Kunde bei der Annahme als ungültig angezeigt.
- **Bezieht Familienbeihilfe** (bei weiteren Personen): Familienbeihilfe, Kinderabsetzbetrag und Geschwisterstaffel werden automatisch zum Haushaltseinkommen dazugerechnet.
- **Nicht im selben Haushalt (keine Berechnung)**: Die Person bleibt beim Kunden erfasst, fließt aber in die gesamte Berechnung nicht ein: Weder ihr Einkommen noch ihre Familienbeihilfe und ihr Kinderabsetzbetrag werden mitgezählt, sie zählt nicht für die Geschwisterstaffel und sie erhöht die Einkommensgrenze nicht.

![Kunde anlegen](images/kunden-anlegen.jpg)

Sobald beim Anlegen eines neuen Kunden Nachname, Vorname und Geburtsdatum des Hauptbeziehers ausgefüllt sind, prüft die Anwendung im Hintergrund, ob bereits ein Kunde mit denselben Angaben existiert, und zeigt gegebenenfalls einen Hinweis "Möglicherweise bereits vorhanden" mit einem Link auf den betroffenen Kunden – noch bevor das restliche Formular ausgefüllt wurde. Dieser frühe Hinweis ersetzt nicht die Duplikatsprüfung beim Speichern (siehe [Kunden-Duplikate](#kunden-duplikate) unten), er macht sie nur früher sichtbar.

Die Bearbeitungsmaske eines bestehenden Kunden zeigt zusätzlich die bereits erfassten weiteren Personen. Jede weitere Person wird als aufklappbare Karte mit einer Zusammenfassungszeile (Name, Alter, Einkommen sowie Kennzeichen wie "Familienbeihilfe") dargestellt; ein Klick auf die Kopfzeile öffnet oder schließt die Detailfelder. Eine neu hinzugefügte Person (**Hinzufügen**) öffnet sich automatisch und erhält den Eingabefokus, alle anderen bleiben eingeklappt. Innerhalb der aufgeklappten Karte kann die Person wieder entfernt werden (**Löschen**).

![Kunde bearbeiten](images/kunden-bearbeiten.jpg)

Über den Button **Anspruch prüfen** kann jederzeit, auch ohne zu speichern, geprüft werden, ob der Haushalt mit den aktuell eingegebenen Daten bezugsberechtigt ist. Das Ergebnis ("Anspruch vorhanden" bzw. "Kein Anspruch vorhanden") wird gemeinsam mit der vollständigen Berechnung angezeigt, sodass nachvollziehbar ist, wie die beiden Summen zustande kommen:

- **Einkommen**: das summierte Einkommen der Personen im Haushalt, die Familienbeihilfe, der Kinderabsetzbetrag und die Geschwisterstaffel – darunter das Gesamteinkommen.
- **Limit**: der Grundbetrag für die Haushaltsgröße (z. B. "Grundbetrag (2 Erw., 1 Kind)"), die Zuschläge für jede weitere erwachsene Person bzw. jedes weitere Kind darüber hinaus sowie die Toleranz – darunter das Gesamtlimit. Zuschlagszeilen erscheinen nur dann, wenn es solche weiteren Personen tatsächlich gibt.

Abgeschlossen wird die Aufstellung mit **Einkommen über Limit**: Bei einem bezugsberechtigten Haushalt steht dort 0,00 €, andernfalls die rot hervorgehobene Differenz. Die Sätze, aus denen sich die Berechnung speist, werden unter [Einstellungen → Statische Werte](einstellungen.md) gepflegt.

Gibt es für die Zusammensetzung eines Haushalts keinen hinterlegten Grundbetrag – etwa weil im Haushalt keine erwachsene Person erfasst ist oder ein Wert unter [Einstellungen → Statische Werte](einstellungen.md) fehlt bzw. abgelaufen ist – meldet die Anwendung "Kein Einkommenslimit für diese Haushaltszusammensetzung konfiguriert (Erwachsene: X, Kinder: Y)!", statt mit einer Grenze von 0,00 € zu rechnen. Der Haushalt wird dann weder geprüft noch gespeichert; zuerst ist der fehlende Wert zu ergänzen bzw. die Personenerfassung zu korrigieren.

![Anspruch prüfen](images/kunden-anspruch-pruefen.jpg)

Damit die Anspruchsfrage nicht erst hinter diesem Button verschwindet, blendet die Anwendung zusätzlich eine kompakte Zusammenfassung oberhalb des Formulars ein, sobald die dafür nötigen Pflichtfelder (Hauptbezieher und Adresse) ausgefüllt sind: Anzahl der berücksichtigten Personen, Einkommen gesamt, Limit sowie – falls über dem Limit – die Differenz. Diese Zusammenfassung aktualisiert sich automatisch während der Eingabe (kurz nach der letzten Änderung) und bleibt beim Scrollen sichtbar; der Button **Anspruch prüfen** öffnet weiterhin die vollständige Aufschlüsselung als Dialog.

Die Buttons **Anspruch prüfen** und **Speichern** sitzen in einer Leiste am unteren Bildschirmrand, die auch bei einem langen Formular immer erreichbar bleibt. Solange das Formular ungespeicherte Änderungen enthält, zeigt diese Leiste zusätzlich den Hinweis "Ungespeicherte Änderungen". Wird versucht, die Seite mit ungespeicherten Änderungen zu verlassen (z. B. über die Navigation), fragt die Anwendung vorher nach, ob die Änderungen verworfen werden sollen.

## Kunden-Duplikate

Unter **Kunden → Kunden-Duplikate** erkennt das System potenzielle doppelt angelegte Kunden (z. B. durch ähnliche Adressen oder Namen) und zeigt sie paarweise gegenüber.

![Kunden-Duplikate](images/kunden-duplikate.jpg)

Eine Legende auf der Seite erklärt die Bedeutung der einzelnen Icons. Wurden keine Duplikate gefunden, erscheint die Meldung "Keine Duplikate gefunden!". Für jedes gefundene Duplikat-Paar stehen folgende Aktionen zur Verfügung:

- **Kunden zusammenführen** (grüner Haken): Öffnet den Datenabgleich zur Zusammenführung.
- **Kunden-Details ansehen** (Lupe): Wechselt zur Detailansicht des jeweiligen Kunden.
- **Kunden löschen** (Papierkorb): Löscht ausschließlich den ausgewählten Kunden, der andere bleibt bestehen.

### Kunden zusammenführen

Beim Zusammenführen bleibt der als Ziel gewählte Kunde bestehen, die übrigen werden nach der Zusammenführung gelöscht. Für Felder, die sich zwischen den Kunden unterscheiden (z. B. Adresse, Vorname), kann ausgewählt werden, welcher Wert übernommen wird; über **Identische Felder anzeigen/ausblenden** lässt sich die Ansicht auf die abweichenden Felder reduzieren. Personen, die nur beim zusammenzuführenden Kunden vorhanden sind, werden automatisch übernommen; die Anzahl der zu übernehmenden Notizen und Dokumente wird angezeigt. Haben beide Kunden ein aktives Ticket der laufenden Ausgabe, weist ein Hinweis darauf hin, welches Ticket beim Zusammenführen erhalten bleibt und welches verworfen wird.

![Kunden zusammenführen](images/kunden-zusammenfuehren.jpg)

<a id="kunden-über-limit"></a>

## Kunden über Limit

Unter **Kunden → Kunden über Limit** werden alle Kunden aufgelistet, deren Gesamteinkommen aktuell über dem für ihre Haushaltsgröße gültigen Limit liegt (siehe [Grenzwerte](einstellungen.md#statische-werte-grenzwerte)). Angezeigt werden u. a. das Gesamteinkommen, das gültige Limit und die Differenz ("Über Limit"); über die Lupe in der Aktionen-Spalte gelangt man direkt zur Detailansicht des jeweiligen Kunden.

![Kunden über Limit](images/kunden-ueber-limit.jpg)

Auf schmalen Bildschirmen wird die Liste als Kartenliste dargestellt (siehe [Darstellung auf schmalen Bildschirmen](README.md#darstellung-auf-schmalen-bildschirmen)).

<a id="kunden-übersicht"></a>

## Kunden-Übersicht

Unter **Kunden → Kunden-Übersicht** werden die neu angelegten und die verlängerten Kunden eines Ausgabetags aufgelistet, getrennt in die Bereiche "Neu" und "Verlängert". Ein Kunde gilt als "verlängert", sobald sein Gültigkeitsdatum ("Bezug verlängern", siehe [Kunden-Detail](#kapitel-kunden)) während des Ausgabetags erweitert wurde. Über die Auswahlbox **Ausgabe** kann zwischen den bereits abgeschlossenen Ausgabetagen gewechselt werden; ohne Auswahl zeigt die Seite den zuletzt begonnenen (bzw. laufenden) Ausgabetag. Über die Lupe in der Aktionen-Spalte gelangt man direkt zur Detailansicht des jeweiligen Kunden.

![Kunden-Übersicht](images/kunden-uebersicht.jpg)

Auf schmalen Bildschirmen werden beide Bereiche ("Neu" und "Verlängert") jeweils als Kartenliste dargestellt (siehe [Darstellung auf schmalen Bildschirmen](README.md#darstellung-auf-schmalen-bildschirmen)).
