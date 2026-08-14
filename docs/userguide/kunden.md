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

Die Detailansicht eines Kunden beginnt mit einem Kopfbereich, der Name und Kundennummer groß darstellt sowie den Status auf einen Blick zeigt: die Gültigkeit als grüne/gelbe/rote Markierung (gelb ab 8 Wochen vor Ablauf), ob der Kunde gesperrt ist, ein offener Unkostenbeitrag samt Betrag, und die Haushaltsgröße. Darunter folgen die Stammdaten des Hauptbeziehers sowie die zuletzt erfasste Notiz.

![Kunden-Detail](images/kunden-detail.jpg)

Rechts oben im Kopfbereich stehen die Aktionen zur Verfügung, gereiht nach ihrer Verwendungshäufigkeit (auf schmalen Bildschirmen erscheinen sie stattdessen unterhalb der Daten, siehe [Darstellung auf schmalen Bildschirmen](README.md#darstellung-auf-schmalen-bildschirmen)):

- **Bezug verlängern**: Verlängert die Gültigkeit des Kunden um 1, 2, 3, 6 oder 12 Monate; jeder Menüpunkt zeigt bereits das resultierende Datum an (z. B. "3 Monate → 12.11.2026").
- **Daten ausdrucken**: Druck der Stammdaten oder nur des Kundenausweises. Während die PDF-Datei erstellt wird, zeigt der Button eine Ladeanimation statt stumm zu warten.
- **Kunde bearbeiten**: Öffnet die Bearbeitung der Stammdaten (siehe unten).
- **Unkostenbeitrag**: Ist noch ein Betrag offen, wird er als roter Hinweis direkt am Button angezeigt; im Menü stehen dann zusätzlich "Alles bezahlt" und "Betrag eintragen" zur Verfügung. Unabhängig davon kann über "Betrag bearbeiten" (unterhalb einer Trennlinie) der Betrag jederzeit manuell korrigiert werden.
- **Weitere Aktionen**: Sammelt die selteneren bzw. sicherheitskritischen Aktionen **Kunde deaktivieren**, **Kunde sperren**/**entsperren** und **Kunde löschen** (jeweils mit Sicherheitsabfrage) in einem Menü.
- Ist gerade ein Ausgabetag aktiv, kann dem Kunden rechts oben eine **Ticketnummer** zugewiesen werden; ist bereits ein Ticket zugewiesen, wird es stattdessen angezeigt und kann über den Papierkorb-Button wieder entfernt werden. Ist der Kunde gesperrt, ist die Zuweisung deaktiviert; ein Tooltip erklärt warum.
- Über den grünen **+**-Button bei "Aktuellste Notiz" (die Kartenüberschrift zeigt zusätzlich die Gesamtanzahl an Notizen) kann eine neue Notiz erfasst werden; bei mehreren Notizen können über **Alle Notizen anzeigen** alle bisherigen Notizen eingesehen werden. Die neueste Notiz zeigt zusätzlich eine relative Zeitangabe ("vor 3 Tagen") mit dem genauen Zeitpunkt als Tooltip.

Telefonnummer und E-Mail-Adresse sind als Links hinterlegt (öffnen die Telefon- bzw. Mail-App); über den Kopieren-Button neben "Adresse" lässt sich die Adresse in die Zwischenablage kopieren, etwa um sie in ein anderes System einzutragen.

Beim **Sperren** eines Kunden muss ein **Sperrgrund** angegeben werden. Ein gesperrter Kunde wird danach mit einem roten Hinweisbanner ("Kunde ist gesperrt!", Zeitpunkt und Benutzer der Sperrung sowie der Sperrgrund) angezeigt, die meisten Aktionen sind deaktiviert (mit erklärendem Tooltip), und der Kopfbereich zeigt zusätzlich einen "Gesperrt"-Hinweis.

![Kunde gesperrt](images/kunden-gesperrt.jpg)

Wurde bei einem Kunden zwischenzeitlich von anderer Stelle etwas geändert (z. B. gleichzeitige Bearbeitung durch eine zweite Person), zeigt die Anwendung vor dem Speichern eine Bestätigungsabfrage mit der Konflikt-Meldung an, bevor die eigene Änderung trotzdem übernommen wird.

### Weitere Personen

Der Tab "Weitere Personen" listet alle zusätzlichen Haushaltsmitglieder (z. B. Kinder) mit Geburtsdatum, Nationalität, Arbeitgeber, Einkommen und der Angabe "Bezieht Familienbeihilfe". Personen, die nicht zum Haushalt zählen, sind mit einer Markierung "Nicht im Haushalt" gekennzeichnet. Sie bleiben bei der Berechnung vollständig außen vor – weder ihr Einkommen noch ihre Familienbeihilfe zählen mit, und sie erhöhen weder die im Kopfbereich angezeigte Haushaltsgröße noch das Einkommenslimit.

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

Beim Anlegen eines neuen Kunden werden die Daten des Hauptbeziehers (Name, Geburtsdatum, Geschlecht, Nationalität, Kontakt, Adresse, Arbeitgeber, Einkommen) sowie optional weitere Personen im Haushalt erfasst. Nachname, Vorname, Telefonnummer, Adresse und Arbeitgeber sind Pflichtfelder; die PLZ muss eine 4-stellige Zahl sein, die Telefonnummer darf nur Ziffern enthalten. Wird beim Einkommen ein Datum "nachgewiesen bis" eingetragen, schlägt das Formular "Gültig bis" automatisch mit diesem Datum zzgl. 2 Monaten vor.

Die fachlich weniger selbsterklärenden Felder tragen ein Info-Symbol (ⓘ), das ihre Wirkung erklärt (siehe [Kurzhinweise](README.md#tooltips-und-erklaerungen)):

- **Einkommen (monatl.)**: Die Einkommen aller Personen im Haushalt werden zusammengezählt und gegen die Einkommensgrenze geprüft.
- **nachgewiesen bis**: Datum, bis zu dem der vorgelegte Einkommensnachweis gültig ist.
- **Alleinerzieher**: Wird nur für die Statistik erfasst und beeinflusst die Einkommensgrenze nicht.
- **Gültig bis**: Ende der Bezugsberechtigung; danach wird der Kunde bei der Annahme als ungültig angezeigt.
- **Bezieht Familienbeihilfe** (bei weiteren Personen): Familienbeihilfe, Kinderabsetzbetrag und Geschwisterstaffel werden automatisch zum Haushaltseinkommen dazugerechnet.
- **Nicht im selben Haushalt (keine Berechnung)**: Die Person bleibt beim Kunden erfasst, fließt aber in die gesamte Berechnung nicht ein: Weder ihr Einkommen noch ihre Familienbeihilfe und ihr Kinderabsetzbetrag werden mitgezählt, sie zählt nicht für die Geschwisterstaffel und sie erhöht die Einkommensgrenze nicht.

![Kunde anlegen](images/kunden-anlegen.jpg)

Die Bearbeitungsmaske eines bestehenden Kunden zeigt zusätzlich die bereits erfassten weiteren Personen inklusive der Möglichkeit, einzelne Personen zu entfernen (**Löschen**) oder neue hinzuzufügen (**Hinzufügen**).

![Kunde bearbeiten](images/kunden-bearbeiten.jpg)

Über den Button **Anspruch prüfen** kann jederzeit, auch ohne zu speichern, geprüft werden, ob der Haushalt mit den aktuell eingegebenen Daten bezugsberechtigt ist. Das Ergebnis ("Anspruch vorhanden" bzw. "Kein Anspruch vorhanden") wird gemeinsam mit der vollständigen Berechnung angezeigt, sodass nachvollziehbar ist, wie die beiden Summen zustande kommen:

- **Einkommen**: das summierte Einkommen der Personen im Haushalt, die Familienbeihilfe, der Kinderabsetzbetrag und die Geschwisterstaffel – darunter das Gesamteinkommen.
- **Limit**: der Grundbetrag für die Haushaltsgröße (z. B. "Grundbetrag (2 Erw., 1 Kind)"), die Zuschläge für jede weitere erwachsene Person bzw. jedes weitere Kind darüber hinaus sowie die Toleranz – darunter das Gesamtlimit. Zuschlagszeilen erscheinen nur dann, wenn es solche weiteren Personen tatsächlich gibt.

Abgeschlossen wird die Aufstellung mit **Einkommen über Limit**: Bei einem bezugsberechtigten Haushalt steht dort 0,00 €, andernfalls die rot hervorgehobene Differenz. Die Sätze, aus denen sich die Berechnung speist, werden unter [Einstellungen → Statische Werte](einstellungen.md) gepflegt.

Gibt es für die Zusammensetzung eines Haushalts keinen hinterlegten Grundbetrag – etwa weil im Haushalt keine erwachsene Person erfasst ist oder ein Wert unter [Einstellungen → Statische Werte](einstellungen.md) fehlt bzw. abgelaufen ist – meldet die Anwendung "Kein Einkommenslimit für diese Haushaltszusammensetzung konfiguriert (Erwachsene: X, Kinder: Y)!", statt mit einer Grenze von 0,00 € zu rechnen. Der Haushalt wird dann weder geprüft noch gespeichert; zuerst ist der fehlende Wert zu ergänzen bzw. die Personenerfassung zu korrigieren.

![Anspruch prüfen](images/kunden-anspruch-pruefen.jpg)

## Kunden-Duplikate

Unter **Kunden → Kunden-Duplikate** erkennt das System potenzielle doppelt angelegte Kunden (z. B. durch ähnliche Adressen oder Namen) und stellt sie als direkten Vergleich gegenüber: Geburtsdatum, Adresse, Personenanzahl und Gültigkeit stehen zeilenweise nebeneinander, abweichende Werte sind hervorgehoben, übereinstimmende Werte blass dargestellt – auf einen Blick ist so erkennbar, worin sich die beiden Kunden unterscheiden. Die Gesamtzahl der noch zu prüfenden Duplikat-Gruppen steht rechts über der Liste (z. B. "6 mögliche Duplikate").

![Kunden-Duplikate](images/kunden-duplikate.jpg)

Für jeden Kandidaten eines Duplikat-Paares stehen folgende Aktionen zur Verfügung:

- **Zusammenführen** (grün hervorgehoben): Öffnet den Datenabgleich zur Zusammenführung für diesen Kunden.
- **Details**: Wechselt zur Detailansicht des jeweiligen Kunden.
- Über die Schaltfläche mit den weiteren Aktionen (▾) stehen zusätzlich zur Verfügung:
  - **Kein Duplikat**: Markiert dieses Paar als geprüft und keine Duplikate – es wird danach nicht mehr in der Liste angezeigt.
  - **Kunde löschen**: Löscht ausschließlich diesen Kunden, der andere bleibt bestehen. Der Bestätigungsdialog nennt dabei ausdrücklich den Namen des zu löschenden Kunden.

Nach dem Löschen oder Markieren als "Kein Duplikat" bleibt die Liste an derselben Position stehen – die geprüfte Gruppe verschwindet einfach aus der Warteschlange. Wurden alle möglichen Duplikate geprüft, erscheint eine positive Bestätigung:

![Keine Duplikate mehr](images/kunden-duplikate-keine.jpg)

### Kunden zusammenführen

Beim Zusammenführen bleibt der als Ziel gewählte Kunde bestehen, die übrigen werden nach der Zusammenführung gelöscht. Für Felder, die sich zwischen den Kunden unterscheiden (z. B. Adresse, Vorname), kann ausgewählt werden, welcher Wert übernommen wird; über **Identische Felder anzeigen/ausblenden** lässt sich die Ansicht auf die abweichenden Felder reduzieren. Personen, die nur beim zusammenzuführenden Kunden vorhanden sind, werden automatisch übernommen; die Anzahl der zu übernehmenden Notizen und Dokumente wird angezeigt. Haben beide Kunden ein aktives Ticket der laufenden Ausgabe, weist ein Hinweis darauf hin, welches Ticket beim Zusammenführen erhalten bleibt und welches verworfen wird.

![Kunden zusammenführen](images/kunden-zusammenfuehren.jpg)

<a id="kunden-über-limit"></a>

## Kunden über Limit

Unter **Kunden → Kunden über Limit** werden alle Kunden aufgelistet, deren Gesamteinkommen aktuell über dem für ihre Haushaltsgröße gültigen Limit liegt (siehe [Grenzwerte](einstellungen.md#statische-werte-grenzwerte)). Diese Liste ist als Arbeitsliste gedacht: Über die Lupe in der Aktionen-Spalte gelangt man direkt zur Detailansicht, wo die Gültigkeit verkürzt, der Kunde gesperrt oder der Zustand akzeptiert werden kann. Der Link öffnet ein echtes `href`, ein Klick mit der mittleren Maustaste öffnet die Detailansicht daher in einem neuen Tab, ohne die Liste zu verlassen.

Oberhalb der Tabelle steht, gegen welche Grenzwerte aktuell geprüft wird ("Stand: heute") sowie – mit der entsprechenden Berechtigung – ein Link **Grenzwerte ansehen** zu [Einstellungen → Grenzwerte](einstellungen.md#statische-werte-grenzwerte). Sind aktuell keine Kunden über dem Limit, erscheint die Meldung "Aktuell liegt kein Kunde über dem Limit" statt einer leeren Tabelle.

Angezeigt werden u. a. das Gesamteinkommen, das gültige Limit und die Differenz ("Über Limit") samt dem prozentuellen Anteil über dem Limit und einem kompakten Balken, der diesen Anteil visualisiert – 50 € über einem 1.500 €-Limit sind damit auf einen Blick von 50 € über einem 3.900 €-Limit unterscheidbar. Die Spalte **Gültig bis** zeigt die Gültigkeit als grün/rot hervorgehobenen Wert, sodass Fälle, die ohnehin bald ablaufen, sofort erkennbar sind. Standardmäßig ist die Liste nach der größten Überschreitung sortiert; die Spalten Einkommen gesamt, Limit und Über Limit lassen sich zusätzlich durch Klick auf die jeweilige Spaltenüberschrift sortieren.

Über **CSV-Export** lässt sich die aktuelle Liste (in der gerade gewählten Sortierung, vollständig statt nur die angezeigte Seite) als CSV-Datei herunterladen, z. B. um sie in eine Besprechung mitzunehmen.

![Kunden über Limit](images/kunden-ueber-limit.jpg)

Auf schmalen Bildschirmen wird die Liste als Kartenliste dargestellt (siehe [Darstellung auf schmalen Bildschirmen](README.md#darstellung-auf-schmalen-bildschirmen)).

<a id="kunden-übersicht"></a>

## Kunden-Übersicht

Unter **Kunden → Kunden-Übersicht** werden die neu angelegten und die verlängerten Kunden eines Ausgabetags aufgelistet. Ein Kunde gilt als "verlängert", sobald sein Gültigkeitsdatum ("Bezug verlängern", siehe [Kunden-Detail](#kapitel-kunden)) während des Ausgabetags erweitert wurde. Ein Kunde, der im selben Ausgabetag sowohl neu angelegt als auch verlängert wurde, erscheint in beiden Zählungen.

Ganz oben zeigen zwei Kacheln die Anzahl der neuen und der verlängerten Kunden des ausgewählten Ausgabetags auf einen Blick. Über die Auswahlbox **Ausgabe** kann zwischen den bereits abgeschlossenen Ausgabetagen gewechselt werden (mit Wochentag, z. B. "Sa, 08.08.2026"); vorausgewählt ist der zuletzt abgeschlossene Ausgabetag. Die Pfeile links und rechts der Auswahlbox blättern schrittweise zum vorherigen bzw. nächsten Ausgabetag, ohne die Liste jedes Mal neu öffnen zu müssen.

Darunter listet eine einzige Tabelle beide Kundengruppen gemeinsam auf, jede Zeile mit einem Typ-Chip ("Neu" bzw. "Verlängert"), der Personenanzahl des Haushalts und einem Gültigkeits-Chip ("Gültig", "Ungültig" oder "Gesperrt"). Über die Schaltflächen **Alle**/**Neu**/**Verlängert** wird die Liste auf eine der beiden Gruppen eingeschränkt. **CSV-Export** lädt die aktuell angezeigte (ungefilterte) Liste des ausgewählten Ausgabetags als CSV-Datei herunter. Über die Lupe in der Aktionen-Spalte gelangt man direkt zur Detailansicht des jeweiligen Kunden.

![Kunden-Übersicht](images/kunden-uebersicht.jpg)

Auf schmalen Bildschirmen wird die Liste als Kartenliste dargestellt (siehe [Darstellung auf schmalen Bildschirmen](README.md#darstellung-auf-schmalen-bildschirmen)).
