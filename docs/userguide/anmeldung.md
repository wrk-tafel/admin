# Anmeldung (Check-in)

Der Bereich "Anmeldung" wird während eines laufenden Ausgabetags verwendet, um Kunden zu erfassen (per Ticket-Nummer oder Scanner) und den Ablauf mit dem Ticket-Monitor zu steuern.

Die Menüpunkte in diesem Bereich sind nur aktiv, solange ein Ausgabetag gestartet ist (siehe [Übersicht](README.md#übersicht-dashboard)).

## Kunden-Annahme

Unter **Anmeldung → Annahme** wird die Kundennummer eines Kunden eingegeben (oder per Scanner-Handy gescannt), um dessen Kundendaten während der Ausgabe direkt anzuzeigen.

![Kunden-Annahme](images/anmeldung-annahme.jpg)

- **Scanner**: Auswahl eines aktiven Scanners, falls mehrere Scanner-Handys im Einsatz sind (siehe [Scanner](#scanner) weiter unten). Der Status (Aktiv/Inaktiv) zeigt, ob eine Verbindung zum ausgewählten Scanner besteht.
- **Kundennummer**: Manuelle Eingabe der Kundennummer, falls kein Scanner verwendet wird. Mit **Anzeigen** wird der Kunde geöffnet.

Wurde ein Kunde angezeigt, erscheint darunter ein Panel mit Status (z. B. bezugsberechtigt, gesperrt), Adresse, Haushaltsgröße, Anzahl Kinder unter 3 Jahren, der letzten Notiz sowie – bei aktivem Ausgabetag – der Eingabe einer Ticket-Nummer, um den Kunden mit **Annehmen** der laufenden Ausgabe zuzuweisen.

![Kunden-Annahme mit Kunde](images/anmeldung-annahme-kunde.jpg)

## Scanner

**"Scanner" ist in der Regel kein eigenes Gerät, sondern ein normales Smartphone**: Unter **Anmeldung → Scanner** wird auf einem Mobiltelefon (oder Tablet/PC) im Browser dessen Kamera als Barcode-/QR-Code-Scanner für Kundenausweise verwendet. Jedes Gerät, auf dem diese Seite geöffnet wird, meldet sich als eigener Scanner an und kann anschließend unter **Kunden-Annahme** ausgewählt werden.

![Scanner](images/anmeldung-scanner.jpg)

Über das Dropdown **Kamera** kann bei mehreren Kameras am Gerät (z. B. Front-/Rückkamera eines Handys) die gewünschte ausgewählt werden. Der Status rechts oben zeigt "Bereit", sobald die Kamera aktiv ist und ein Ausweis-Code erkannt werden kann.

![Scanner aktiv](images/anmeldung-scanner-aktiv.jpg)

## Ticket-Monitor – Steuerung

Unter **Anmeldung → Ticket-Monitor** wird der Ablauf der Ticket-Ausgabe gesteuert, die auf einem zweiten Bildschirm (Kundenanzeige) für die wartenden Kunden sichtbar ist.

![Ticket-Monitor Steuerung](images/anmeldung-ticketmonitor-steuerung.jpg)

- **Startzeit**: Uhrzeit, ab der die Ticket-Nummern hochgezählt werden.
- **Tickets**: Mit **Aktuelles Ticket** / **Vorheriges Ticket** kann zur laufenden Ticket-Nummer gesprungen bzw. zurückgeblättert werden.
- **Aktuelles Ticket**: Zeigt die gerade aufgerufene Ticket-Nummer. Mit **Weiter (bezahlt)** bzw. **Weiter (nicht bezahlt)** wird zum nächsten Ticket weitergeschaltet und gleichzeitig vermerkt, ob der Unkostenbeitrag beglichen wurde.
- **Unkostenbeitrag (bestehend)**: Zeigt einen noch offenen Unkostenbeitrag des aktuellen Kunden aus einer früheren Ausgabe. Mit **Alles bezahlt**, **Betrag eintragen** oder **Betrag bearbeiten** kann dieser direkt verbucht werden.
- **Live-Ansicht**: Vorschau dessen, was auf dem Kundenmonitor angezeigt wird. Über **Monitor öffnen** wird die Vollbildansicht (siehe unten) in einem neuen Fenster/Tab geöffnet, das z. B. auf einen zweiten Bildschirm gezogen werden kann.

## Ticket-Monitor – Vollbildansicht

Die Vollbildansicht (`/anmeldung/ticketmonitor`) zeigt ausschließlich die aktuelle Ticket-Nummer in großer Schrift und ist für die Anzeige auf einem separaten Kundenbildschirm gedacht.

![Ticket-Monitor Vollbild](images/anmeldung-ticketmonitor-fullscreen.jpg)
