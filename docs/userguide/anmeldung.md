<a id="kapitel-anmeldung"></a>

# Anmeldung (Check-in)

Der Bereich "Anmeldung" wird während eines laufenden Ausgabetags verwendet, um Kunden zu erfassen (per Ticket-Nummer oder Scanner) und den Ablauf mit dem Ticket-Monitor zu steuern.

Die Menüpunkte in diesem Bereich sind nur aktiv, solange ein Ausgabetag gestartet ist (siehe [Übersicht](README.md#übersicht-dashboard)).

## Kunden-Annahme

Unter **Anmeldung → Annahme** wird die Kundennummer eines Kunden eingegeben (oder per Scanner-Handy gescannt), um dessen Kundendaten während der Ausgabe direkt anzuzeigen.

![Kunden-Annahme](images/anmeldung-annahme.jpg)

- **Scanner**: Auswahl eines aktiven Scanners, falls mehrere Scanner-Handys im Einsatz sind (siehe [Scanner](#scanner) weiter unten). Der Status (Aktiv/Inaktiv) zeigt, ob eine Verbindung zum ausgewählten Scanner besteht.
- **Kundennummer**: Manuelle Eingabe der Kundennummer, falls kein Scanner verwendet wird. Mit **Anzeigen** wird der Kunde geöffnet.

Wurde ein Kunde angezeigt, erscheint darunter ein Panel mit farblich gekennzeichnetem Status (GÜLTIG, GÜLTIG – läuft bald ab [innerhalb der nächsten 8 Wochen], UNGÜLTIG oder GESPERRT) sowie ggf. einer separaten Kennzeichnung "Unkostenbeitrag offen", Adresse, Haushaltsgröße, einem Tab mit den weiteren Haushaltspersonen, der letzten Notiz sowie – bei aktivem Ausgabetag – der Eingabe einer Ticket-Nummer, um den Kunden mit **Annehmen** der laufenden Ausgabe zuzuweisen. Ist bereits ein Ticket zugewiesen, kann die Eingabe über **Abbrechen** verworfen bzw. das Ticket über den Papierkorb-Button wieder gelöscht werden.

![Kunden-Annahme mit Kunde](images/anmeldung-annahme-kunde.jpg)

## Scanner

**"Scanner" ist in der Regel kein eigenes Gerät, sondern ein normales Smartphone**: Unter **Anmeldung → Scanner** wird auf einem Mobiltelefon (oder Tablet/PC) im Browser dessen Kamera als Barcode-/QR-Code-Scanner für Kundenausweise verwendet. Jedes Gerät, auf dem diese Seite geöffnet wird, meldet sich als eigener Scanner an und kann anschließend unter **Kunden-Annahme** ausgewählt werden. Die Seite ist für die Bedienung mit einer Hand am Telefon ausgelegt und läuft in zwei aufeinanderfolgenden Ansichten ab:

**Kopplungs-Ansicht** (bevor die Kamera das erste Mal erfolgreich gestartet ist): Die Scanner-Nummer wird groß und zentriert angezeigt, damit sie quer durch den Raum vorgelesen und in der **Kunden-Annahme** ausgewählt werden kann. Darunter befindet sich das Dropdown **Kamera**, über das bei mehreren Kameras am Gerät (z. B. Front-/Rückkamera eines Handys) die gewünschte ausgewählt werden kann – ohne gespeicherte Auswahl wird automatisch die Rückkamera bevorzugt. Der Status zeigt "Bereit" bzw. "Nicht bereit", je nachdem ob die Kamera aktiv ist. Ist am Gerät keine Kamera verfügbar, erscheint stattdessen die Meldung "Keine Kamera gefunden".

![Scanner](images/anmeldung-scanner.jpg)

**Scan-Ansicht** (sobald die Kamera das erste Mal erfolgreich gestartet hat): Das Kamerabild rückt in den Vordergrund, die Scanner-Nummer wird zu einer kleinen Anzeige in der oberen Ecke verkleinert. Unterstützt das Gerät eine Taschenlampe, erscheint oben rechts ein Taschenlampen-Symbol zum Ein-/Ausschalten (z. B. für dunkle Ladezonen).

Ein erfolgreich erkannter Code wird unmissverständlich bestätigt: Der Bildschirm blendet kurz eine großflächige Farbfläche mit der erkannten Kundennummer ein (grün bei einem neuen Scan, orange bei einem unmittelbar wiederholten Scan desselben Codes), zusätzlich vibriert das Gerät (sofern unterstützt) und gibt einen kurzen Signalton aus.

![Scanner aktiv](images/anmeldung-scanner-aktiv.jpg)

Bricht während des Scannens entweder die Kamera oder die Anmeldung des Scanners beim Server ab, wird das Kamerabild vollflächig mit der Meldung "Verbindung getrennt" überlagert, statt dass dies nur an einem kleinen Status-Symbol erkennbar wäre – über den Button **Erneut verbinden** kann die Anmeldung neu versucht werden.

Damit der Bildschirm während einer laufenden Ausgabe nicht von selbst sperrt, wird er – sofern vom Gerät/Browser unterstützt – automatisch wachgehalten.

## Ticket-Monitor – Steuerung

Unter **Anmeldung → Ticket-Monitor** wird der Ablauf der Ticket-Ausgabe gesteuert, die auf einem zweiten Bildschirm (Kundenanzeige) für die wartenden Kunden sichtbar ist.

![Ticket-Monitor Steuerung](images/anmeldung-ticketmonitor-steuerung.jpg)

- **Startzeit**: Uhrzeit, ab der die Ticket-Nummern hochgezählt werden.
- **Tickets**: Mit **Aktuelles Ticket** / **Vorheriges Ticket** kann zur laufenden Ticket-Nummer gesprungen bzw. zurückgeblättert werden.
- **Aktuelles Ticket**: Zeigt die gerade aufgerufene Ticket-Nummer. Mit **Weiter (bezahlt)** bzw. **Weiter (nicht bezahlt)** wird zum nächsten Ticket weitergeschaltet und gleichzeitig vermerkt, ob der Unkostenbeitrag beglichen wurde.
- **Unkostenbeitrag (bestehend)**: Zeigt einen noch offenen Unkostenbeitrag des aktuellen Kunden aus einer früheren Ausgabe. Mit **Alles bezahlt** wird der offene Betrag zur Gänze als bezahlt vermerkt, über **Betrag eintragen** ein Teilbetrag erfasst und über **Betrag bearbeiten** ein bereits eingetragener Betrag korrigiert – jede Aktion öffnet einen eigenen Dialog.
- **Live-Ansicht**: Vorschau dessen, was auf dem Kundenmonitor angezeigt wird. Über **Monitor öffnen** wird die Vollbildansicht (siehe unten) in einem neuen Fenster/Tab geöffnet, das z. B. auf einen zweiten Bildschirm gezogen werden kann.

## Ticket-Monitor – Vollbildansicht

Die Vollbildansicht (`/anmeldung/ticketmonitor`) zeigt ausschließlich die aktuelle Ticket-Nummer in großer Schrift und ist für die Anzeige auf einem separaten Kundenbildschirm (z. B. einem Fernseher im Warteraum) gedacht.

![Ticket-Monitor Vollbild](images/anmeldung-ticketmonitor-fullscreen.jpg)

- **Vollbild-Button**: Unten rechts blendet ein Button die Browser-Oberfläche komplett aus (Vollbildmodus); nach dem Klick verschwindet er wieder von selbst, erscheint aber erneut, sobald der Vollbildmodus (z. B. über Esc) wieder verlassen wird.
- Solange die Seite geöffnet ist, verhindert die Anwendung, dass der Bildschirm des Anzeigegeräts automatisch in den Ruhezustand wechselt (sofern der Browser dies unterstützt) – auch nach einem Tab-Wechsel wird das beim Zurückkehren automatisch erneut sichergestellt.
- Wechselt die angezeigte Ticket-Nummer, wird sie kurz animiert (Skalierung/Aufblitzen), damit ein Wechsel auch im Augenwinkel auffällt; darunter erscheint zusätzlich klein die zuvor aufgerufene Nummer (z. B. "Zuvor: 41"), falls jemand den Wechsel verpasst hat. Über den Link-Parameter `?sound=1` (z. B. `/anmeldung/ticketmonitor?sound=1`) lässt sich zusätzlich ein kurzer Ton bei jedem Ticketwechsel aktivieren – nützlich für Räume, in denen der Monitor außerhalb des direkten Sichtfelds hängt.
- Bricht die Verbindung zum Server ab, wird das anstelle eines kleinen Hinweises groß und zentriert mit "Verbindung getrennt" sowie dem Zeitpunkt der letzten Anzeige angezeigt, damit das auch aus einiger Entfernung auffällt; sobald die Verbindung wiederhergestellt ist, aktualisiert sich die Anzeige automatisch.
