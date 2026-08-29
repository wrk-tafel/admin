# Changelog

Diese Datei dokumentiert die nennenswerten Änderungen an Tafel Admin auf Deutsch, kurz und knapp gehalten. Jede neue Funktion oder Korrektur, die für Anwender:innen sichtbar ist, ergänzt hier einen Eintrag unter `## [Unreleased]`. Die Release-Pipeline übernimmt neu hinzugekommene Zeilen automatisch in die Release-Notes auf GitHub (siehe `release.yml` und CLAUDE.md, Abschnitt "Changelog").

Jeder Eintrag ist eine einzelne, nicht umgebrochene Zeile, die mit `- ` beginnt - die Release-Pipeline erkennt einen neuen Changelog-Eintrag genau daran.

## [Unreleased]
- Die Ergebnistabellen der Anmelde-Versuche, der Mitarbeiterliste und der Kinder-Auswertung lassen sich jetzt durch Klick auf eine Spaltenüberschrift auf- oder absteigend sortieren.
- Der Scanner-Bildschirm zeigt die Kamera-Vorschau nach dem Wechsel von der Kopplungs- in die Scan-Ansicht jetzt zuverlässig an, statt möglicherweise ein eingefrorenes Bild zu zeigen.
- Beim Verlassen des Scanner-Bildschirms wird die Kamera jetzt auch dann beendet, wenn die Scanner-Registrierung oder die Kamera-Erkennung zu diesem Zeitpunkt noch nicht abgeschlossen war.
- Bei der Kunden-Annahme zeigt die Scanner-Statusanzeige "AKTIV" jetzt erst an, wenn die Verbindung zum Scanner tatsächlich hergestellt wurde, statt unabhängig vom tatsächlichen Verbindungsstatus.
- Bei der Kunden-Annahme werden angezeigte Notiz und Ticket-Nummer jetzt immer dem zuletzt gesuchten bzw. gescannten Kunden zugeordnet, auch wenn eine vorherige, langsamere Suche erst danach beim Server antwortet.
- Die Screenshots im Benutzerhandbuch zeigen wieder den aktuellen Stand der Anwendung (u. a. Kunden-Detailansicht mit Notizen-Tab, Kunden-Suche mit den neuen Filtern, Zugriffsprotokoll, Datenauskunft, Benutzerverwaltung und Mitarbeiter-Einstellungen); die Beschreibung des Tabs "Verlauf" nennt jetzt auch die protokollierten Zugriffe.
- Beim Bearbeiten eines Benutzerkontos wird jetzt immer nur das über die Adresse ausgewählte Konto geändert, auch wenn das Bearbeitungsformular eine davon abweichende Kontokennung übermittelt.
- Beim Bearbeiten eines Benutzerkontos wird jetzt verhindert, dass eine bereits einem anderen Konto zugeordnete Personalnummer übernommen und dessen Mitarbeiter-Datensatz dadurch überschrieben wird.
- Beim Löschen mehrerer Treffer auf der Seite "Datenauskunft" schlägt der gesamte Vorgang jetzt nicht mehr fehl, wenn der mit einem gelöschten Benutzerkonto verknüpfte Mitarbeiter-Datensatz noch von einem anderen Benutzerkonto verwendet wird - der Mitarbeiter-Datensatz bleibt in diesem Fall bestehen.
- Die Ersteinrichtung des Administrator-Kontos schlägt jetzt nicht mehr fehl, wenn die Datenbank zwar noch keine Benutzerkonten, aber bereits einen zur konfigurierten Personalnummer passenden Mitarbeiter-Datensatz enthält.
- Die Ermittlung der Client-IP-Adresse (u. a. für Login-Sperren und die Anfragebegrenzung von Login/Support) vertraut jetzt nur mehr dem unmittelbaren Reverse-Proxy und lässt sich nicht mehr über einen gefälschten X-Forwarded-For-Header umgehen oder gezielt gegen eine fremde IP-Adresse missbrauchen.
- Beim Registrieren einer Push-Benachrichtigung wird die vom Browser übermittelte Push-Adresse jetzt geprüft; unverschlüsselte oder auf ein internes Netzwerk zeigende Adressen werden abgelehnt.
- Ein Login-Versuch ohne gültige Basic-Authentifizierung liefert jetzt wie ein fehlgeschlagener Login-Versuch einen regulären Fehlerstatus statt eines internen Serverfehlers.
- Beim Bearbeiten eines Kunden wird jetzt immer nur der über die Adresse ausgewählte Kunde geändert, auch wenn das Bearbeitungsformular eine davon abweichende Kundennummer übermittelt.
- Beim Bearbeiten eines Kunden wird jetzt verhindert, dass eine im Formular übermittelte Personen-ID einer Person zugeordnet wird, die nicht zu diesem Kunden gehört, oder dass beim Tausch des Hauptbeziehers mit einer weiteren Person eine der beiden Personen verloren geht.
- Beim Anlegen oder Bearbeiten eines Kunden wird jetzt sichergestellt, dass genau eine Person als Hauptbezieher markiert ist, statt ohne Hauptbezieher gespeichert zu werden oder erst später mit einem Serverfehler zu scheitern.
- Die Filter der Kunden-Suche (z. B. "Gültig", "Gesperrt", "Nachbearbeitung nötig") liefern jetzt auch bei einer negativen Auswahl das korrekte Ergebnis, statt in beiden Fällen dieselbe (positive) Trefferliste zu zeigen.
- Das Stammdatenblatt-PDF eines Kunden mit "Nachbearbeitung nötig" schlägt jetzt nicht mehr mit einem Serverfehler fehl, wenn eine weitere Person keinen Vor- oder Nachnamen hat - stattdessen wird wie bei den übrigen Feldern "-" angezeigt.
- Der Datenexport (DSGVO) eines Kunden verwendet für jedes enthaltene Dokument jetzt nur mehr den reinen Dateinamen als Eintrag im ZIP-Archiv, auch wenn ein vor längerer Zeit hochgeladenes Dokument noch einen vollständigen Pfad gespeichert hat.
- Beim Anlegen oder Bearbeiten eines Mitarbeiters wird eine Personalnummer mit führenden oder folgenden Leerzeichen jetzt korrekt auf Duplikate geprüft, statt fälschlich als frei zu gelten oder mit einem Serverfehler zu scheitern.
- Das Beenden einer Ausgabe schlägt jetzt nicht mehr mit einem Serverfehler fehl, wenn eine weitere Person ohne bekanntes Geburtsdatum eingecheckt ist - Statistik, offene Unkostenbeiträge und alle E-Mails gehen dadurch nicht mehr verloren; auch die "Kundenliste"-PDF lässt sich in diesem Fall wieder erzeugen.
- Beim Kunden-Check-in wird die bereits zugewiesene eigene Ticketnummer jetzt akzeptiert, statt fälschlich als "bereits vergeben" abgelehnt zu werden.
- Bei mehreren gleichzeitig laufenden Anwendungsinstanzen wird die laufende Ausgabe jetzt korrekt anhand ihres Beginns erkannt, statt anhand einer instanzabhängigen internen Kennung - vorher konnte eine bereits beendete Ausgabe fälschlich als laufend gelten und eine tatsächlich laufende als "nicht gestartet".
- Beim manuellen erneuten Versenden der E-Mails einer Ausgabe wird jetzt kein Serverfehler mehr ausgelöst, wenn parallel bereits eine zweite Ausgabe beendet wurde - stattdessen erscheint ein regulärer Fehlerhinweis; für eine noch nicht beendete Ausgabe wird der Versand jetzt abgelehnt statt E-Mails mit leeren Platzhalterwerten zu verschicken, und Geräte erhalten dabei keine erneute "Ausgabe beendet"-Benachrichtigung mehr.
- Die jahresübergreifenden Statistik-Exporte "Tagesreports" und "Spenden" führen die soeben beendete Ausgabe jetzt nicht mehr doppelt auf und verwenden dabei das Jahr der jeweiligen Ausgabe statt des aktuellen Datums, auch wenn der Export erst im neuen Jahr für eine Ausgabe des Vorjahres erneut versendet wird.
- Der Statistik-Export "Altersverteilung" zeigt die Kennzahl "Personen/Haushalt" jetzt mit zwei Nachkommastellen statt auf eine ganze Zahl abgerundet.
- Die Statistik-Kennzahlen "Bezugsberechtigte Personen" und "Bezugsberechtigte Haushalte mit Kindern" zählen nicht zum Haushalt zählende Personen jetzt nicht mehr mit.
- Die Kennzahl "Sonstige Aktualisierungen" im Tagesreport zeigt jetzt keinen negativen Wert mehr, wenn ein Kunde im selben Zeitraum sowohl neu angelegt als auch verlängert wurde.
- Der Statistik-Export "Haushaltsgrößen" berücksichtigt Haushalte mit mehr als 10 Personen jetzt in einer eigenen Zeile "11+", statt sie weder zu zählen noch in der Prozentsumme zu berücksichtigen.
- Die Retourkisten-E-Mail zeigt die Menge einer Filiale, die auf mehreren Routen angefahren wird, jetzt getrennt pro Route, statt sie über alle Routen hinweg zusammenzuzählen.
- Beim Erfassen der gefahrenen Kilometer einer Route wird jetzt verhindert, dass der Kilometerstand am Ende kleiner als der am Start ist.
- Beim Wechsel der Route in der mobilen Warenerfassung wird die noch nicht gespeicherte Retourware der zuletzt gezeigten Filiale jetzt korrekt der zuvor ausgewählten statt der neu ausgewählten Route zugeordnet; ohne Internetverbindung wird der Speicherversuch jetzt nicht mehr unternommen, sondern stattdessen gewarnt, dass die noch nicht gespeicherte Retourware verloren geht.
- Beim Bearbeiten des Kilometerstands einer Route bleibt eine Fehlermeldung ("KM Ende muss größer als KM Start sein" bzw. "nur gemeinsam") jetzt nicht mehr bestehen, nachdem der ursprüngliche Grund dafür behoben wurde.
- Der Auswahlpunkt "Bitte auswählen" im Routen-Dropdown der Warenerfassung führt jetzt nicht mehr zu einem Fehler, sondern setzt die Ansicht korrekt zurück; eine Route ohne Filialen führt in der mobilen Ansicht ebenfalls nicht mehr zu einem Fehler.
- Der Bildschirm bleibt während der Routenführung jetzt auch dann dauerhaft an, wenn er zwischenzeitlich vom Betriebssystem in den Hintergrund geschickt und die Bildschirm-Sperre dabei vom System selbst wieder freigegeben wurde.
- Das Bearbeiten einer Route (z. B. nur der Name) löscht den bereits erfassten Tagesfortschritt der Routenführung (abgehakte Stopps) jetzt nicht mehr, sofern sich die Stopps selbst nicht geändert haben.
- Die Nationalität lässt sich beim Anlegen oder Bearbeiten eines Kunden jetzt durch Eintippen aus der Länderliste suchen, statt nur über eine lange Auswahlliste durchgeblättert zu werden.
- Die Schnellsuche (Strg+K) nennt jetzt im Suchfeld sowie über einen Kurzhinweis, dass sie auch nach der Kundennummer sucht, und bietet unter "Aktionen" zusätzlich den Download der Datenschutzerklärung für Mitarbeiter:innen an.
- Der direkte Sprung zu einem Kunden oder Benutzer über eine reine Nummer erfolgt jetzt erst nach Enter oder Klick auf "Suchen", statt bereits während der Eingabe zu greifen und dadurch bei einer noch unvollständigen Nummer fälschlich zu einem anderen, kürzeren Datensatz zu springen.
- Die Nationalitäts-Suche beim Anlegen oder Bearbeiten eines Kunden zeigt jetzt zuerst die am häufigsten verwendeten Länder, durch einen Trennstrich abgesetzt von der restlichen, alphabetisch sortierten Liste.
- Ein durch die XSRF-Token-Race verursachter HTTP-403-Fehler zeigt jetzt keinen Fehler-Toast und Protokolleintrag mehr, wenn der automatische Wiederholungsversuch erfolgreich war.
- Die Anzeige "Live-Verbindung" erkennt jetzt auch eine durch einen Netzwerkfehler dauerhaft unterbrochene Verbindung, statt bei einer nie endgültig geschlossenen Verbindung fälschlich verbunden zu bleiben.
- Nach einem Abmelden und erneuten Anmelden in derselben Browser-Registerkarte wird der zuletzt bekannte Ausgabe-Status jetzt zurückgesetzt, statt bis zur nächsten Aktualisierung den Stand der vorherigen Sitzung zu zeigen; nach einem fehlgeschlagenen Abrufen der Benutzerinformationen (z. B. bei abgelaufener Sitzung) gilt die Anmeldung jetzt korrekt als beendet.
- Bei den Listen "Kinder-Statistik", "Mitarbeiter", "Zugriffsprotokoll", "Datenauskunft" und "Anmelde-Versuche" überschreibt eine langsamer eintreffende, veraltete Antwort jetzt nicht mehr das Ergebnis einer zwischenzeitlich schon ausgeführten neueren Suche bzw. Seitenumschaltung.
- Beim Bearbeiten eines Benutzerkontos wird ein im wieder eingeklappten Abschnitt "Passwort zurücksetzen" eingegebenes Passwort jetzt nur noch übernommen, wenn der Abschnitt beim Speichern tatsächlich noch geöffnet ist.
- Die Inline-Bearbeitung des Gewichts pro Einheit einer Lebensmittelkategorie verlangt jetzt wie beim Anlegen einen gültigen, nicht negativen Wert, statt erst beim Speichern mit einem allgemeinen Fehlerhinweis zu scheitern.
- Größere Datei-Downloads (z. B. DSGVO-Exporte als ZIP) werden jetzt zuverlässiger abgeschlossen, statt in manchen Browsern vorzeitig abgebrochen zu werden.
- Beim Löschen eines Kunden-Dokuments bzw. beim Importieren einer Scanner-Datei wird die Datei jetzt erst von der Festplatte entfernt, wenn die zugehörige Datenbank-Änderung tatsächlich abgeschlossen ist, statt dass ein anschließend fehlschlagender Vorgang eine bereits gelöschte Datei oder einen verlorenen Scan hinterlässt.
- Das Bearbeiten eines statischen Werts (z. B. einer Einkommensgrenze) schlägt jetzt mit einem regulären Fehlerhinweis fehl, wenn dieser Wert zwischenzeitlich bereits durch eine andere, gleichzeitige Änderung ersetzt wurde, statt zwei gleichzeitig gültige Einträge für denselben Wert anzulegen.
- Beim Speichern der E-Mail-Empfänger-Einstellungen wird ein unbekannter Mailtyp jetzt mit einem regulären Fehlerhinweis abgelehnt statt mit einem Serverfehler; eine bestehende Adresse kann dabei außerdem nicht mehr versehentlich einer anderen Mailtyp/Empfänger-Kategorie zugeordnet werden.
- Das Blättern in einer Liste mit Seitennummerierung (u. a. Zugriffsprotokoll, Benutzerliste, Mitarbeiterliste) liefert bei der Seitenzahl 0 oder einer negativen Seitenzahl jetzt die erste Seite statt eines Serverfehlers.
- Ein nicht antwortender Mailserver blockiert die geplanten Hintergrund-Jobs der Anwendung (u. a. E-Mail-Versand, Datenbereinigung) jetzt nicht mehr unbegrenzt lange.
- Die Ergebnistabellen der Kunden- und Benutzer-Suche lassen sich jetzt durch Klick auf eine Spaltenüberschrift (Nr., Name, Geb. Datum, Ausgestellt am, Gültig bis bzw. Personalnummer, Status) auf- oder absteigend sortieren.

## [1.14.0] - 2026-08-29
- Die Kunden-Suche bietet jetzt einen zusätzlichen Filter "Datenschutzerklärung veraltet", der Kunden zeigt, deren hochgeladene Datenschutzerklärung mit einer inzwischen geänderten Aufbewahrungsfrist bedruckt wurde.
- Das Benutzerhandbuch (Datenauskunft, "Technische Spuren nach der Löschung") nennt die "Kein Duplikat"-Einstufung nicht mehr als dauerhaft verbleibende Spur - sie wird seit der Umstellung auf Fremdschlüssel gemeinsam mit dem Haushalt gelöscht.
- Die Konfiguration für die Aufbewahrungsfrist von Haushalten (`tafeladmin.householdDeletion.retentionYears`) heißt jetzt `retentionTime` und wird wie bei Benutzerkonten/Mitarbeitern als Zeitraum (z. B. `7y`) statt als reine Jahreszahl angegeben.
- Der Menüpunkt "Änderungsprotokoll" heißt jetzt "Zugriffsprotokoll", da er neben Änderungen auch Zugriffe auf sensible Daten erfasst; die Benutzerhandbuch-Beschreibung des Öffnens der Kunden-Detailseite als Zugriff wurde dabei korrigiert. Der Filter "Art der Änderung" heißt aus demselben Grund jetzt "Art des Zugriffs".
- Die Kunden-Detailansicht zeigt die Stammdaten des Hauptbeziehers im Tab "Allgemeine Daten" jetzt zweispaltig über die volle Breite; ein neuer Tab "Notizen" nach "Weitere Personen" zeigt zusätzlich zur weiterhin dort sichtbaren aktuellsten Notiz (die sich jetzt auch direkt dort korrigieren oder löschen lässt) die vollständige, paginierte Liste aller Notizen statt eines Dialogs.
- Auf der Kunden-Annahme-Seite haben die Hinweise "Unkostenbeitrag offen" und "Datenschutzerklärung fehlt" jetzt einen sichtbaren Abstand zueinander, statt bei gleichzeitiger Anzeige direkt aneinanderzustoßen.
- Die Markierung nicht zum Haushalt zählender Personen heißt jetzt "Nicht im selben Haushalt" statt "Nicht im Haushalt".
- Die Kunden-Suche bietet jetzt einen zusätzlichen Filter "Wird in den nächsten 30 Tagen gelöscht", der Kunden zeigt, deren Daten wegen Ablaufs der Aufbewahrungsfrist bald automatisch entfernt werden.
- Eine neue Benachrichtigungsart "Bereinigungsjob auffällig" informiert Administrator:innen jetzt per Push, wenn eine automatische Lösch-Bereinigung (Haushalte, Benutzerkonten, Mitarbeiter oder Änderungsprotokoll) fehlschlägt oder mehr Datensätze als konfiguriert löschen würde - in letzterem Fall wird die Löschung dieses Durchlaufs abgebrochen, statt durchzuführen.
- Dateien im Scanner-Ordner, die nicht importiert oder gelöscht werden, werden jetzt nach 7 Tagen automatisch entfernt; Benutzer:innen mit der Berechtigung "Kunden-Dokumente" erhalten vorher eine Push-Benachrichtigung, damit die Datei rechtzeitig importiert oder bewusst gelöscht werden kann.
- Der Datenexport (DSGVO) für Kunden enthält jetzt zusätzlich das Verlängerungsdatum, ob eine Datenschutzerklärung vorliegt, wer Haushalt, Personen und Notizen zuletzt geändert hat sowie bei Dokumenten die zugeordnete Person und die hochladende Person; der Datenexport für Benutzerkonten enthält jetzt zusätzlich das Erstellungsdatum des Kontos, wann und von wem eine Berechtigung erteilt wurde, registrierte Push-Geräte und individuelle Benachrichtigungseinstellungen, offene Anmeldeversuche sowie die Login-Historie der letzten 30 Tage.
- Beim Löschen mehrerer Treffer auf der Seite "Datenauskunft" werden Dokumente eines Kunden jetzt erst dann endgültig von der Festplatte entfernt, wenn der gesamte Löschvorgang erfolgreich abgeschlossen ist - vorher konnten bei einem später fehlschlagenden Treffer (z. B. fehlende Berechtigung oder ein nicht löschbares letztes Administrator-Konto) bereits entfernte Dateien verwaist zurückbleiben.
- Änderungen an Mitarbeiter:innen (Anlegen, Bearbeiten, Löschen) werden jetzt im Änderungsprotokoll erfasst; beim Löschen eines Kunden werden dort jetzt auch die gelöschten Notizen vermerkt.
- Das Änderungsprotokoll zeigt Feldwerte (z. B. Adresse, Einkommen) aus Haushalts-, Personen-, Notiz- und Dokumenten-Einträgen jetzt nur noch mit zusätzlicher Berechtigung "Kundenverwaltung" an; der "Verlauf"-Tab in der Kundenansicht benötigt diese Berechtigung jetzt ebenfalls.
- Beim Löschen eines Benutzerkontos über die Seite "Datenauskunft" wird der verknüpfte Mitarbeiter-Datensatz jetzt sofort mitgelöscht, sofern er nicht noch anderswo verwendet wird (vorher blieb er bis zu 7 Jahre bestehen).
- Beim Hochladen eines Dokuments wird jetzt zusätzlich zur Dateiendung auch der tatsächliche Dateiinhalt geprüft, damit eine falsch deklarierte oder umbenannte Datei nicht mehr als Ausweis oder Einkommensnachweis akzeptiert wird.
- Ändern des eigenen Passworts sowie das Zurücksetzen eines Passworts durch eine Administration entziehen jetzt sofort allen bereits ausgestellten Anmeldungen dieses Benutzerkontos die Gültigkeit; ebenso macht ein Abmelden das dabei verwendete Anmeldeticket sofort ungültig, statt es nur im Browser zu entfernen.
- Das Änderungsprotokoll erfasst jetzt zusätzlich das Öffnen der Kunden-Detailansicht als Zugriff auf sensible Kundendaten, damit die Warnung bei ungewöhnlich vielen Zugriffen auch dieses Aufrufen erkennt.
- Der Hinweis auf eine neue verfügbare Version wird jetzt nicht mehr als Warnung, sondern als neutral-positive Meldung angezeigt.
- Beim Zusammenführen von Kunden werden verschobene Notizen und Dokumente im Änderungsprotokoll jetzt einzeln erfasst statt nur als Gesamtanzahl.
- Das Anliegen einer Support-Anfrage und der Text einer Kundennotiz sind jetzt auf eine maximale Länge begrenzt.
- Die Suche auf der Seite "Datenauskunft" durchsucht jetzt nur noch die Bereiche (Kunden, Benutzerkonten, Mitarbeiter ohne Konto), für die auch die jeweilige Fachbereichs-Berechtigung vorliegt, statt immer alle drei zu durchsuchen.
- Die Suche auf der Seite "Datenauskunft" zeigt jetzt einen Hinweis an, wenn in einem der drei Bereiche mehr als 20 Treffer vorliegen und daher nicht alle angezeigt werden.
- Beim Löschen mehrerer Treffer auf der Seite "Datenauskunft" wird jetzt namentlich aufgelistet, welcher Treffer bereits gelöscht war, statt nur eine Anzahl anzuzeigen.
- Fehlermeldungen bei fehlerhaft empfangenen Live-Aktualisierungen (SSE) enthalten jetzt keine Nutzdaten mehr, damit über die Support-Anfrage keine personenbezogenen Daten (z. B. Haushalts- oder Ticketnummern) versehentlich mitgeschickt werden.
- Beim endgültigen Löschen eines Haushalts werden jetzt auch dessen als "Kein Duplikat" abgelehnte Duplikat-Prüfungen mitgelöscht, statt dauerhaft in der Datenbank zu verbleiben.
- Die Live-Aktualisierung der Scanner-Dateiliste im Dokumente-Tab der Kundenansicht benötigt jetzt ebenfalls die Berechtigung "Kunden-Dokumente" statt der allgemeinen Kundenverwaltung.
- Der Download von Kundendokumenten sowie von DSGVO-Exporten (Benutzer, Mitarbeiter, Datenauskunft, Ausgabe-Kundenliste) schlägt nicht mehr fehl, wenn der Dateiname Sonderzeichen, Anführungszeichen oder Umlaute enthält.
- Der Download von Kunden-Stammdatenblatt/Ausweis, Kunden-ZIP-Export, Datenschutzerklärung-Vorlage, Auswertungen (über Limit, Kundenübersicht, Statistik-CSVs) sowie Scanner-Dateien schlägt jetzt ebenfalls nicht mehr fehl, wenn der Dateiname Sonderzeichen, Anführungszeichen oder Umlaute enthält.
- Anmeldungen und Support-Anfragen werden jetzt pro IP-Adresse begrenzt, um wiederholte automatisierte Anmeldeversuche zu erschweren; bei Überschreitung erscheint auf der Anmeldeseite ein eigener Hinweis statt der allgemeinen Fehlermeldung.
- Neben der Sperre pro Benutzerkonto nach zu vielen Fehlversuchen gibt es jetzt zusätzlich eine Sperre pro Internetadresse, falls von dort über viele verschiedene Benutzernamen hinweg zu viele Anmeldeversuche fehlschlagen.
- Ein wegen zu vieler Fehlversuche vorübergehend gesperrtes Benutzerkonto zeigt bei der Anmeldung jetzt dieselbe allgemeine Fehlermeldung wie ein falsches Passwort, statt eines eigenen Hinweises - damit von außen nicht erkennbar ist, welche Konten gerade gesperrt sind.
- Ein neu gewähltes Passwort muss jetzt sowohl Klein- als auch Großbuchstaben sowie eine Ziffer enthalten.
- Die Datenschutzerklärung für Kund:innen enthält jetzt zusätzlich Angaben zu Empfänger:innen, Datenübermittlung in Drittländer, Pflichtangaben/Folgen der Nichtbereitstellung sowie automatisierter Entscheidungsfindung; die genannte Aufbewahrungsfrist wird nicht mehr fest eingetragen, sondern aus der aktuellen Konfiguration übernommen.
- Mitarbeiter:innen können sich über das Benutzermenü jetzt eine eigene Datenschutzerklärung herunterladen; für Mitarbeiter:innen ohne eigenes Benutzerkonto steht dieselbe Datenschutzerklärung auch auf der Seite "Mitarbeiter" zum Download bereit.
- Die Datenschutzerklärung für Kund:innen und für Mitarbeiter:innen zeigt jetzt in der Fußzeile links das Erstellungsdatum und rechts die Seitenzahl an.
- Die Seitenzahl in der Fußzeile der DSGVO-Datenexporte (Kunden, Benutzerkonten, Mitarbeiter ohne Konto) sowie der Kundenliste zur Ausgabe überlagert nicht mehr den Inhalt, wenn dieser bis zum unteren Seitenrand reicht.
- Kundennotizen können jetzt im Dialog "Alle Notizen anzeigen" von der Person, die sie verfasst hat, nachträglich korrigiert oder endgültig gelöscht werden, statt nur unveränderlich angelegt werden zu können.
- Eine neu erfasste Kundennotiz mit mehreren Zeilen zeigt nicht mehr fälschlich das Zeichen "<br/>" anstelle eines Zeilenumbruchs an.
- Die DSGVO-Datenexporte für Benutzerkonten und Mitarbeiter ohne Konto sind jetzt jeweils eine ZIP-Datei statt einer einzelnen PDF-Datei und enthalten zusätzlich zur PDF-Datei dieselben Daten maschinenlesbar als JSON-Datei; der Kunden-Datenexport enthält diese JSON-Datei jetzt ebenfalls zusätzlich zur bestehenden PDF-Datei.
- Das Änderungsprotokoll erfasst jetzt zusätzlich das Öffnen der Detailansicht eines Benutzerkontos als Zugriff auf sensible Daten, damit die Warnung bei ungewöhnlich vielen Zugriffen auch dieses Aufrufen erkennt.
- Das Zugriffsprotokoll erfasst jetzt zusätzlich das eigene Durchsuchen sowie den Aufruf des Verlauf-Tabs einer Kundin/eines Kunden als Zugriff, damit auch das Lesen des Protokolls selbst nachvollziehbar bleibt.
- Die Push-Benachrichtigung bei einer endgültig fehlgeschlagenen E-Mail-Zustellung nennt die E-Mail jetzt nach ihrer Art und laufenden Nummer (z. B. "Support-Anfrage #123") statt nach ihrem Betreff, da dieser bei einer Support-Anfrage den von der meldenden Person frei gewählten Titel enthält.
- Die Datenschutzerklärung für Mitarbeiter:innen nennt jetzt zusätzlich die bei einer fehlgeschlagenen Anmeldung gespeicherte IP-Adresse samt Löschfrist; die Datenschutzerklärung für Kund:innen nennt jetzt zusätzlich das Änderungsprotokoll samt dessen Aufbewahrungsfrist.
- Die Berichte "Kunden über dem Limit", "Kunden-Übersicht" sowie die Kunden-Duplikate-Verwaltung erfordern jetzt zusätzlich zur jeweiligen eigenen Berechtigung auch die Berechtigung "Kundenverwaltung", da ihre Antworten vollständige Kundendaten enthalten.
- Der Aufruf der Berichte "Kunden über dem Limit" und "Kunden-Übersicht" (inkl. CSV-Export) sowie der Kunden-Duplikate und einer Zusammenführungs-Vorschau wird jetzt im Änderungsprotokoll als Zugriff erfasst und bei der Warnung wegen ungewöhnlich vieler Zugriffe stärker gewichtet als eine einzelne Kundenansicht.
- Ein bei der Kunden-, Benutzer-, Mitarbeiter- oder Datenauskunft-Suche eingegebener Suchbegriff landet jetzt weder im technischen Server-Zugriffsprotokoll (access.log) noch im Text einer darüber abgeschickten Support-Anfrage; beim Anlegen eines Kunden über die leere Kunden-Suche wird der vorausgefüllte Name außerdem nicht mehr in der Browser-Adresszeile angezeigt.
- Ein Fehler im Browser der Anwendung wird jetzt automatisch im technischen Server-Log vermerkt, damit er auffällt, auch wenn niemand dazu eine Support-Anfrage schreibt.

## [1.13.1] - 2026-08-26
- Der Button "Daten löschen" auf der Seite "Datenauskunft" ist jetzt als kritische Aktion hervorgehoben (rot statt neutral).
- Der Bestätigungsdialog beim Löschen eines Kunden weist jetzt darauf hin, wenn der Kunde noch ein Ticket in der laufenden Ausgabe hat, das dadurch aus der Warteschlange entfernt wird.

## [1.13.0] - 2026-08-26
- Im Benutzermenü kann jetzt unter "Meine Daten exportieren" eine DSGVO-Auskunft zum eigenen Benutzerkonto (Benutzername, Mitarbeiter-Stammdaten, Berechtigungen, Aktiv-Status, letzter Login) als PDF-Datei heruntergeladen werden; auf der Benutzerdetailseite steht derselbe Export für andere Benutzer:innen zur Verfügung.
- In der Kundenansicht kann unter "Weitere Aktionen" jetzt eine ZIP-Datei mit den vollständigen Kundendaten (Stammdaten, weitere Personen, Notizen, Teilnahme-Historie, Dokumentenliste) als PDF-Datei sowie allen hochgeladenen Dokumenten heruntergeladen werden, für die Beantwortung einer DSGVO-Auskunftsanfrage.
- Der Dokumente-Tab in der Kundenansicht (Ausweise, Einkommensnachweise) benötigt jetzt die eigene Berechtigung "Kunden-Dokumente" statt der allgemeinen Kundenverwaltung; bestehende Benutzer:innen mit Kundenverwaltung erhalten die neue Berechtigung automatisch mit.
- In der Mitarbeiterverwaltung kann jetzt pro Mitarbeiter eine DSGVO-Auskunft (Personalnummer, Name, Anlagedatum) als PDF-Datei heruntergeladen werden - der einzige Auskunftsweg für Mitarbeiter:innen ohne eigenes Benutzerkonto, z. B. reine Fahrer:innen.
- Eine neue Seite "Datenauskunft" durchsucht Kunden, Benutzerkonten und Mitarbeiter ohne Benutzerkonto mit einem einzigen Suchfeld und bietet je gefundenem Treffer den Datenexport (als ein gemeinsames ZIP bei mehreren ausgewählten Treffern) sowie die endgültige Löschung an - dafür ist die neue Berechtigung "Datenauskunft" zusätzlich zur jeweiligen Fachbereichs-Berechtigung erforderlich.
- Der Spenden-Export (TOeT_Spenden) zeigt für bereits erfasste Warenerfassungen dauerhaft die zum Erfassungszeitpunkt gültigen Namen von Route, Filiale und Lebensmittelkategorie, auch wenn diese später umbenannt werden.
- Die Kunden-Annahme zeigt jetzt einen Warnhinweis "Datenschutzerklärung fehlt", wenn für den angezeigten Haushalt noch keine unterschriebene Datenschutzerklärung als Dokument hochgeladen ist.

## [1.12.0] - 2026-08-25
- Beim Erfassen einer Notiz und beim Hochladen eines Dokuments erinnert jetzt ein Hinweis daran, nur für die Anspruchsprüfung notwendige Angaben zu erfassen - keine Angaben zu Gesundheit, Religion oder ähnlichen besonders schützenswerten Daten.
- Die Support-Anfrage weist jetzt im Dialog selbst darauf hin, bei einem Kundenanliegen die Kundennummer statt des Namens zu verwenden und die Kundenseite vor dem Öffnen zu verlassen, falls deren Inhalt nicht als Screenshot mitgeschickt werden soll.
- Das Änderungsprotokoll erfasst jetzt zusätzlich zu Änderungen auch eine kleine, gezielte Auswahl an Zugriffen auf sensible Kundendaten: den Download eines Dokuments, das Ansehen einer Scanner-Datei sowie die Erstellung des Stammdatenblatts, des Ausweises oder der Kundenliste einer Ausgabe.
- Administrator:innen werden jetzt per Push benachrichtigt, wenn ein Benutzerkonto innerhalb einer Stunde ungewöhnlich viele sensible Kundendaten abruft.
- Haushalte werden jetzt automatisch endgültig gelöscht (inkl. Personen, Notizen, Dokumenten und Ausgabe-Teilnahmen), sobald ihre Gültigkeit seit mehr als 7 Jahren abgelaufen ist.
- Benutzerkonten werden jetzt automatisch endgültig gelöscht, sobald sie sich seit mehr als 7 Jahren nicht mehr angemeldet haben (Administrator-Konten ausgenommen); Mitarbeiter:innen, auf die nirgends mehr verwiesen wird, werden nach 7 Jahren ebenso endgültig gelöscht.
- In der Kundenansicht kann jetzt unter "Daten ausdrucken" eine Datenschutzerklärung zum Ausdrucken und Unterschreiben heruntergeladen und nach der Unterschrift als eigener Dokumenttyp wieder hochgeladen werden.
- Bei der Kundensuche und in der Schnellsuche (Strg+K) kann die Datenschutzerklärung jetzt auch ohne Kundenbezug als Vorlage heruntergeladen werden, z. B. um sie einer Person schon vor der Kundenanlage zum Unterschreiben mitzugeben.
- Neuer Filter "Datenschutzerklärung fehlt" bei der Kundensuche, für Kunden ohne hochgeladene unterschriebene Datenschutzerklärung.
- Die Navigation in der Seitenleiste zeigt beim Überfahren mit der Maus jetzt wieder zuverlässig eine Hervorhebung an, auch auf Geräten, die fälschlicherweise als reine Touch-Geräte erkannt werden.

## [1.11.0] - 2026-08-24
- Mitarbeiter können jetzt jederzeit endgültig gelöscht werden; bereits erfasste Kundendaten, Notizen und Warenerfassungen, die auf einen gelöschten Mitarbeiter verweisen, zeigen stattdessen "Mitarbeiter gelöscht" an. Ist noch ein Benutzerkonto mit dem Mitarbeiter verknüpft, muss dieses zuerst entfernt werden.
- Kunden anlegen/bearbeiten warnt jetzt beim Speichern, wenn Name und Adresse einem bereits vorhandenen Kunden ähneln oder eine Person mit gleichem Namen und Geburtsdatum schon in einem anderen Haushalt erfasst ist - erst nach Bestätigung wird trotzdem gespeichert.

## [1.10.0] - 2026-08-24
- Die Release-Notes auf GitHub sind jetzt durchgehend auf Deutsch und enthalten wieder einen Link zum vollständigen Änderungsprotokoll.
- E-Mail-Empfänger: Entfernen eines bereits gespeicherten Empfängers wirkt jetzt sofort, ohne "Speichern".
- Fahrzeuge: ein noch nie in einer Warenerfassung verwendetes Fahrzeug kann jetzt endgültig gelöscht werden.

## [1.9.0] - 2026-08-22
- Übersicht: solange keine Ausgabe läuft, füllt eine Zusammenfassung der letzten Ausgabe (Kunden, Personen, Tickets, Warenmenge, Notschlafstellen) zusammen mit organisationsweiten Kennzahlen (Haushalte, Personen, Benutzer, Fahrzeuge, Notschlafstellen, Routen, Filialen, Mitarbeiter:innen) die Seite, statt leere Tageskacheln zu zeigen.

## [1.8.1] - 2026-08-21
- Interne Wartungsarbeiten (Dokumentation, Abhängigkeiten), keine sichtbaren Funktionsänderungen.

## [1.8.0] - 2026-08-17
- Einheitliches visuelles Design für E-Mails (Layout, Kopf- und Fußbereich).
- Einheitliches visuelles Design für alle PDF-Vorlagen (Ausweis, Stammdaten, Tagesbericht, Kundenliste).

## [1.7.0] - 2026-08-16
- Icons wurden von FontAwesome auf Material Symbols umgestellt (einheitlicheres Erscheinungsbild).
- Kundensuche: neuer Filter "Gesperrt"; der angezeigte Mitarbeitername wird synchron gehalten.
- Das Benutzermenü verlinkt direkt auf die aktuelle Version des Benutzerhandbuchs.
- Berechtigungsänderungen wirken jetzt sofort, ohne erneute Anmeldung.
- Routen-Navi springt automatisch zum nächsten Stopp, sobald einer abgeschlossen ist.
- Erfolgreiche Anmeldungen und der letzte Login-Zeitpunkt eines Benutzers werden protokolliert.

## [1.6.0] - 2026-08-15
- Umfassende UX/UI-Überarbeitung fast aller Bildschirme: Anmeldung, Passwort-Änderung, Fehlerseiten (404/500), Dashboard, Kundenbereich, Checkin/Scanner/Ticket-Monitor, Benutzerverwaltung, Einstellungen, Statistiken, Änderungsprotokoll und die Anwendungsnavigation.
- Neuer Einkommens-Schnellcheck, um die Anspruchsberechtigung vor der vollständigen Kundenanlage zu prüfen.
- Globale Schnellsuche (Strg+K) für Kunden und Navigation.
- Statistiken: Vergleich mit der Vorperiode sowie das laufende Jahr als Zeitraum.
- Änderungsprotokoll: Filter bleiben beim Blättern aktiv, Einträge werden nach Tag gruppiert.
- Familienbeihilfe-Stufe und Berechnung des Einkommens-Limits werden nachvollziehbar angezeigt.
- Geplante Wartungsjobs laufen nur noch einmal pro Serververbund statt je Instanz.
- Fehlgeschlagene E-Mails im Postausgang werden nach 30 Tagen automatisch gelöscht.

## [1.5.0] - 2026-08-10
- Routenführung umbenannt in "Routen-Navi", führt Fahrer:innen Stopp für Stopp inklusive Retourware.
- Dashboard zeigt den Fortschritt jeder Route.
- Support-Anfragen werden als E-Mail (mit Kontext und Screenshot) über einen Mail-Postausgang verschickt.
- Neues Änderungsprotokoll: Änderungen an Kunden, Personen, Benutzern u. a. werden nachvollziehbar protokolliert, inklusive Ansicht direkt am Kunden.
- Bei der Ersteinrichtung wird automatisch ein Administrator-Konto angelegt.
- Filialen und Routen werden in den Einstellungen als aufklappbare Listen verwaltet.
- Push-Benachrichtigungen für die Phasen eines Ausgabetags, mit Berechtigungssteuerung und Deep-Links.
- Neue Berechtigung "Administrator"; das letzte aktive Administrator-Konto kann nicht mehr entfernt werden.
- Kunden- und Benutzersuche nutzen jetzt eine unscharfe Volltextsuche über ein einziges Suchfeld.
- Tooltips für Icon-Buttons und Erklärungen zu Fachbegriffen ergänzt.

## [1.4.2] - 2026-08-08
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [1.4.1] - 2026-08-08
- Zuverlässigkeitskorrekturen: Server-Push-Verbindungen (SSE) verbinden sich nach einer Unterbrechung automatisch neu, verpasste Ereignisse werden nachgeliefert.
- Abmeldung: die Seite bleibt bis zur Weiterleitung sichtbar.
- Sperren-Fehler bei gleichzeitigen Ausgaben-Aktionen behoben.

## [1.4.0] - 2026-08-08
- Serverkonfiguration kann ohne Neustart der Anwendung aktualisiert werden.
- Der optionale Scanner-Ordner sowie die Umgebungskennzeichnung lassen sich pro Umgebung ein- und ausschalten.
- Warenerfassung: freie Retour-Positionen in einem eigenen Bereich mit einem gemeinsamen Speichern-Button; Retour-Kategorien werden in den Einstellungen verwaltet.
- Ladebildschirm zeigt App-Name und Umgebung.

## [1.3.0] - 2026-08-07
- Neu: optionale Web-Push-Benachrichtigungen, u. a. beim Start und Abschluss einer Ausgabe, inklusive eigener Geräteverwaltung mit Test-Benachrichtigung.

## [1.2.0] - 2026-08-07
- Anmeldeversuche wurden vom Bereich Einstellungen in den Bereich Benutzer verschoben.
- App-Titel und PWA-Symbol lassen sich pro Umgebung anpassen (Branding).
- Verbessertes Logging für Ausgaben-, Anmelde- und Kundenaktionen.

## [1.1.0] - 2026-08-05
- Neue Kunden-Übersicht: neue und erneuerte Haushalte je Ausgabe.
- Kunden-Unterseiten in der Navigation zu einer aufklappbaren Gruppe zusammengefasst.

## [1.0.2] - 2026-08-05
- Technische Umstellung der Web-Adressen (kein `#` mehr in der URL); bestehende Lesezeichen auf alte `#`-URLs sollten neu gesetzt werden.

## [1.0.1] - 2026-08-04
- Fehlerbehebung beim automatisierten Erstellen des Benutzerhandbuch-PDFs, kein Unterschied für Anwender:innen.

## [1.0.0] - 2026-08-04
- Offene Unkostenbeiträge können direkt am Ticket-Monitor beglichen werden.
- Dashboard zählt und listet nur vollständig erfasste Routen.
- Zusammenführen von Kundendubletten überarbeitet: Feld-für-Feld-Auswahl inklusive Übernahme von Personen, Notizen und Verlauf.
- Kombiniertes Kunden-PDF (Ausweis und Stammdaten) entfernt; verwaiste Dokumentdateien werden automatisch bereinigt.
- Dokumenten-Upload für Haushalte, inklusive Einbindung des Scanner-Ordners.
- Neue Einstellungsseite für Anmeldeversuche (mit Entsperren) und für Mitarbeiter:innen (mit Seitenweise-Anzeige).
- Neuer In-App-Support-Kontakt, der eine Meldung an das Entwicklungsteam erstellt.
- Warenerfassung ist als installierbare Web-App auch offline nutzbar.

## [0.5.0] - 2026-07-30
- Neue Verwaltungsseite für Fahrzeuge in den Einstellungen.

## [0.4.4] - 2026-07-30
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.4.3] - 2026-07-30
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.4.2] - 2026-07-29
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.4.1] - 2026-07-29
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.4.0] - 2026-07-29
- Berechtigungen werden bei Benutzern nun nach Kategorie gruppiert dargestellt (Anlage, Bearbeitung, Detailansicht).

## [0.3.2] - 2026-07-29
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.3.1] - 2026-07-29
- Anmeldeseite überarbeitet (Design, Autofill- und Enter-Tasten-Fehler behoben).
- Diverse kleinere UI-Korrekturen (Dialog-Kontrast, Kategorie-Umbenennung).

## [0.3.0] - 2026-07-29
- Allgemeine Verbesserungen am visuellen Erscheinungsbild.

## [0.2.1] - 2026-07-29
- Verbleibende Formulare von CoreUI auf Angular Material umgestellt.
- Kleinere Layout-Korrekturen (Tab-Ausrichtung, Kartenhöhen, Alleinerzieher-Feld).
- Release-Notes auf GitHub zeigen jetzt den Docker-Image-Verweis.

## [0.2.0] - 2026-07-28
- Neues Merkmal "Alleinerzieher" je Haushalt, inklusive Anzeige am Kunden und im Tagesbericht.

## [0.1.0] - 2026-07-28
- Erstes Release: automatisierte Versionsvergabe (SemVer) und Anzeige der laufenden Version in der Seitenleiste.
