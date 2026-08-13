<a id="kapitel-anmeldung"></a>

# Anmeldung (Check-in)

Der Bereich "Anmeldung" wird während eines laufenden Ausgabetags verwendet, um Kunden zu erfassen (per Ticket-Nummer oder Scanner) und den Ablauf mit dem Ticket-Monitor zu steuern.

Die Menüpunkte in diesem Bereich sind nur aktiv, solange ein Ausgabetag gestartet ist (siehe [Übersicht](README.md#übersicht-dashboard)).

## Kunden-Annahme

Unter **Anmeldung → Annahme** wird die Kundennummer eines Kunden eingegeben (oder per Scanner-Handy gescannt), um dessen Kundendaten während der Ausgabe direkt anzuzeigen. Der Bildschirm ist bewusst für schnelles, wiederholtes Arbeiten ausgelegt: Eingabe, Status, Kontext, Ticket-Nummer und Aktionen sind in dieser Reihenfolge in einer einzigen Spalte angeordnet, und die Eingabetaste übernimmt sowohl die Kundensuche als auch das Annehmen, ohne die Maus zu benötigen.

![Kunden-Annahme](images/anmeldung-annahme.jpg)

- **Scanner**: Kompakte Zeile rechts oben zur Auswahl eines aktiven Scanners, falls mehrere Scanner-Handys im Einsatz sind (siehe [Scanner](#scanner) weiter unten). Der Status (Aktiv/Inaktiv) zeigt, ob eine Verbindung zum ausgewählten Scanner besteht. Da diese Auswahl in der Regel nur einmal pro Schicht getroffen wird, nimmt sie bewusst wenig Platz ein.
- **Kundennummer**: Manuelle Eingabe der Kundennummer, falls kein Scanner verwendet wird. Mit **Anzeigen** oder der Eingabetaste wird der Kunde geöffnet.
- **Zuletzt angenommen**: Erscheint nach dem Annehmen eines Kunden als eigene Zeile mit Kundennummer und Ticket-Nummer sowie einem **Rückgängig**-Button, um eine falsch eingegebene Ticket-Nummer sofort zu korrigieren, ohne den Kunden erneut suchen zu müssen. Dieselbe Rückgängig-Aktion steht zusätzlich kurz als Hinweis mit Aktions-Button an.

Wurde ein Kunde angezeigt, erscheint darunter ein großflächiges, farbiges Statusband (grün/gelb/rot) mit dem Status in großer Schrift sowie der entscheidenden Zusatzinformation direkt darunter: bei GÜLTIG bzw. GÜLTIG – läuft bald ab [innerhalb der nächsten 8 Wochen] das Gültig-bis-Datum, bei UNGÜLTIG das Datum, seit dem die Gültigkeit abgelaufen ist, und bei GESPERRT der hinterlegte Sperrgrund. Ist zusätzlich ein Unkostenbeitrag offen, wird der Betrag als eigene Kennzeichnung im Statusband angezeigt, damit er nicht übersehen wird. Direkt darunter folgt die letzte Notiz zum Haushalt – ist eine vorhanden, ist sie farblich/mit Symbol hervorgehoben, da sie oft wichtige Hinweise für die Annahme enthält. Haushaltsgröße und Anzahl der Personen unter 3 Jahren werden als große Zahlen dargestellt, da diese beiden Werte bei jeder Annahme relevant sind. Es folgen die Adresse sowie ein Tab mit den weiteren Haushaltspersonen und – bei aktivem Ausgabetag – die Eingabe einer Ticket-Nummer, um den Kunden mit **Annehmen** der laufenden Ausgabe zuzuweisen. Ist bereits ein Ticket zugewiesen, kann die Eingabe über **Abbrechen** verworfen bzw. das Ticket über den Papierkorb-Button wieder gelöscht werden.

![Kunden-Annahme mit Kunde](images/anmeldung-annahme-kunde.jpg)

## Scanner

**"Scanner" ist in der Regel kein eigenes Gerät, sondern ein normales Smartphone**: Unter **Anmeldung → Scanner** wird auf einem Mobiltelefon (oder Tablet/PC) im Browser dessen Kamera als Barcode-/QR-Code-Scanner für Kundenausweise verwendet. Jedes Gerät, auf dem diese Seite geöffnet wird, meldet sich als eigener Scanner an und kann anschließend unter **Kunden-Annahme** ausgewählt werden.

![Scanner](images/anmeldung-scanner.jpg)

Über das Dropdown **Kamera** kann bei mehreren Kameras am Gerät (z. B. Front-/Rückkamera eines Handys) die gewünschte ausgewählt werden. Der Status rechts oben zeigt "Bereit" bzw. "Nicht bereit", je nachdem ob die Kamera aktiv ist und ein Ausweis-Code erkannt werden kann. Ist am Gerät keine Kamera verfügbar, erscheint stattdessen die Meldung "Keine Kamera gefunden".

![Scanner aktiv](images/anmeldung-scanner-aktiv.jpg)

## Ticket-Monitor – Steuerung

Unter **Anmeldung → Ticket-Monitor** wird der Ablauf der Ticket-Ausgabe gesteuert, die auf einem zweiten Bildschirm (Kundenanzeige) für die wartenden Kunden sichtbar ist.

![Ticket-Monitor Steuerung](images/anmeldung-ticketmonitor-steuerung.jpg)

- **Startzeit**: Uhrzeit, ab der die Ticket-Nummern hochgezählt werden.
- **Tickets**: Mit **Aktuelles Ticket** / **Vorheriges Ticket** kann zur laufenden Ticket-Nummer gesprungen bzw. zurückgeblättert werden.
- **Aktuelles Ticket**: Zeigt die gerade aufgerufene Ticket-Nummer. Mit **Weiter (bezahlt)** bzw. **Weiter (nicht bezahlt)** wird zum nächsten Ticket weitergeschaltet und gleichzeitig vermerkt, ob der Unkostenbeitrag beglichen wurde.
- **Unkostenbeitrag (bestehend)**: Zeigt einen noch offenen Unkostenbeitrag des aktuellen Kunden aus einer früheren Ausgabe. Mit **Alles bezahlt** wird der offene Betrag zur Gänze als bezahlt vermerkt, über **Betrag eintragen** ein Teilbetrag erfasst und über **Betrag bearbeiten** ein bereits eingetragener Betrag korrigiert – jede Aktion öffnet einen eigenen Dialog.
- **Live-Ansicht**: Vorschau dessen, was auf dem Kundenmonitor angezeigt wird. Über **Monitor öffnen** wird die Vollbildansicht (siehe unten) in einem neuen Fenster/Tab geöffnet, das z. B. auf einen zweiten Bildschirm gezogen werden kann.

## Ticket-Monitor – Vollbildansicht

Die Vollbildansicht (`/anmeldung/ticketmonitor`) zeigt ausschließlich die aktuelle Ticket-Nummer in großer Schrift und ist für die Anzeige auf einem separaten Kundenbildschirm gedacht.

![Ticket-Monitor Vollbild](images/anmeldung-ticketmonitor-fullscreen.jpg)
