# Tafel Admin – Benutzerhandbuch

Dieses Handbuch beschreibt alle Funktionen der Tafel-Admin-Anwendung aus Sicht der Anwenderinnen und Anwender. Es richtet sich an Mitarbeiterinnen und Mitarbeiter sowie ehrenamtliche Helfer, die mit dem System täglich arbeiten.

## Inhalt

| Kapitel | Beschreibung |
|---|---|
| [Anmeldung & Übersicht](anmeldung.md) | Login, Dashboard, Ausgabetag starten/beenden, Kunden-Annahme, Scanner, Ticket-Monitor |
| [Kunden](kunden.md) | Kunden suchen, anlegen, bearbeiten, Duplikate, Über-Limit-Kunden, Kunden zusammenführen, Dokumente |
| [Logistik](logistik.md) | Warenerfassung pro Route |
| [Benutzer](benutzer.md) | Benutzerverwaltung und Berechtigungen |
| [Einstellungen](einstellungen.md) | E-Mail-Empfänger, Notschlafstellen, Grenzwerte, Warenkategorien, Fahrzeuge, Mitarbeiter, Anmelde-Versuche |
| [Statistiken](statistiken.md) | Allgemeine Statistik, Schulstartpakete |

## Anmeldung

Der Login erfolgt über Benutzername und Passwort. Nach der Anmeldung gelangt man automatisch zur Übersicht (Dashboard).

![Login](images/login.jpg)

Über das Benutzer-Icon oben rechts kann das eigene Passwort geändert oder man kann sich abmelden.

![Benutzermenü](images/benutzermenue.jpg)

Beim ersten Login bzw. nach einem erzwungenen Passwortwechsel führt das System automatisch zur Seite "Passwort ändern":

![Passwort ändern](images/passwort-aendern.jpg)

Das neue Passwort muss mindestens 8 und maximal 50 Zeichen lang sein, darf den Benutzernamen nicht enthalten, keine Leerzeichen haben und bestimmte Wörter (z. B. "wrk", "tafel", "roteskreuz") nicht enthalten.

## Navigation

Die linke Seitenleiste zeigt alle Menüpunkte, für die der angemeldete Benutzer berechtigt ist. Menüpunkte, die eine aktive Ausgabe voraussetzen (z. B. "Annahme", "Waren-Eingabe"), sind mit **INAKTIV** gekennzeichnet, solange kein Ausgabetag gestartet wurde.

Die Menüstruktur gliedert sich in folgende Bereiche:

- **Anmeldung**: Annahme, Scanner, Ticket-Monitor
- **Kunden**: Kunden suchen, Kunden anlegen, Kunden-Duplikate, Kunden über Limit
- **Logistik**: Waren-Eingabe
- **Sonstige**: Benutzer, Statistiken, Einstellungen

Welche Menüpunkte sichtbar sind, hängt von den dem Benutzer zugewiesenen Berechtigungen ab (siehe [Benutzer](benutzer.md)).

## Übersicht (Dashboard)

Die Übersicht ist die Startseite und zeigt den aktuellen Status des Ausgabetags sowie Kennzahlen des Tages.

![Übersicht](images/dashboard.jpg)

- **Status**: Zeigt an, ob der Ausgabetag "Geöffnet" oder "Geschlossen" ist. Mit **Tag starten** wird eine neue Ausgabe begonnen, mit **Tag beenden** wird sie abgeschlossen (dabei werden u. a. die Mitarbeiterzahl und die genutzten Notschlafstellen abgefragt).
- **Kunden angemeldet**: Anzahl der für den heutigen Tag angemeldeten Kunden. Über **Kundenliste** kann die Liste der angemeldeten Kunden heruntergeladen werden.
- **Tickets abgearbeitet**: Fortschritt der Ticket-Bearbeitung (verarbeitete / gesamt).
- **Erfasste Routen (Anzahl/Details)** und **Erfasste Warenmenge**: Fortschritt der Warenerfassung aus der Logistik (siehe [Logistik](logistik.md)).
- **Statistik**: Eingabe der Mitarbeiteranzahl und der Personen in den ausgewählten Notschlafstellen für den Tagesreport.
- **Anmerkungen**: Freitext-Notizen zum aktuellen Ausgabetag, die z. B. im Tagesreport per E-Mail versendet werden.

## Support-Anfrage

Über die Schaltfläche **Support-Anfrage** oben in der Kopfzeile kann jederzeit ein Anliegen (Fehler, Verbesserungsvorschlag) mit Titel und Beschreibung gemeldet werden. Die Anfrage wird direkt als GitHub-Issue angelegt.

![Support-Anfrage](images/support-anfrage.jpg)

## Pflege dieses Handbuchs

Dieses Benutzerhandbuch muss bei jeder neuen Funktion bzw. jeder funktionalen Änderung mit aktualisiert werden (siehe `AGENTS.md`).
