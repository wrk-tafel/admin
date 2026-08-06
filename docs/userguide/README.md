# Tafel Admin – Benutzerhandbuch

Dieses Handbuch beschreibt alle Funktionen der Tafel-Admin-Anwendung aus Sicht der Anwenderinnen und Anwender. Es richtet sich an Mitarbeiterinnen und Mitarbeiter sowie ehrenamtliche Helfer, die mit dem System täglich arbeiten.

## Inhalt

| Kapitel | Beschreibung |
|---|---|
| [Anmeldung & Übersicht](anmeldung.md) | Login, Dashboard, Ausgabetag starten/beenden, Kunden-Annahme, Scanner, Ticket-Monitor |
| [Kunden](kunden.md) | Kunden suchen, anlegen, bearbeiten, Duplikate, Über-Limit-Kunden, Kunden-Übersicht, Kunden zusammenführen, Dokumente |
| [Logistik](logistik.md) | Warenerfassung pro Route |
| [Benutzer](benutzer.md) | Benutzerverwaltung und Berechtigungen, Anmelde-Versuche |
| [Einstellungen](einstellungen.md) | E-Mail-Empfänger, Notschlafstellen, Grenzwerte, Warenkategorien, Fahrzeuge, Mitarbeiter |
| [Statistiken](statistiken.md) | Allgemeine Statistik, Schulstartpakete |

## Anmeldung

Der Login erfolgt über Benutzername und Passwort. Nach der Anmeldung gelangt man automatisch zur Übersicht (Dashboard).

![Login](images/login.jpg)

Über das Benutzer-Icon oben rechts kann das eigene Passwort geändert, die Push-Benachrichtigungen für das aktuelle Gerät verwaltet oder man kann sich abmelden.

![Benutzermenü](images/benutzermenue.jpg)

Über **Passwort ändern** gelangt man zu folgender Seite innerhalb der Anwendung:

![Passwort ändern](images/passwort-aendern.jpg)

Über **Benachrichtigungen** kann man Push-Benachrichtigungen für den aktuell verwendeten Browser aktivieren, z. B. um automatisch informiert zu werden, sobald eine Ausgabe beendet wurde (relevant für Benutzer mit einer Leitungs-Berechtigung). Da die Anmeldung pro Gerät/Browser erfolgt, muss dieser Schalter auf jedem Gerät einzeln aktiviert werden, auf dem Benachrichtigungen gewünscht sind. Unterstützt der aktuelle Browser keine Push-Benachrichtigungen, wird stattdessen ein entsprechender Hinweis angezeigt.

![Benachrichtigungen](images/benachrichtigungen.jpg)

Ist beim Login eine Passwortänderung erforderlich (z. B. beim erstmaligen Login oder nach einem von der Verwaltung erzwungenen Passwortwechsel), zeigt das System stattdessen direkt nach der Anmeldung automatisch eine eigene, davon unabhängige Seite – noch bevor die eigentliche Anwendung geöffnet wird:

![Passwort ändern nach erzwungenem Login](images/login-passwort-aendern.jpg)

In beiden Fällen gelten dieselben Regeln: Das neue Passwort muss mindestens 8 und maximal 50 Zeichen lang sein, darf den Benutzernamen nicht enthalten, keine Leerzeichen haben und bestimmte Wörter (z. B. "wrk", "tafel", "roteskreuz") nicht enthalten.

Je nach Grund wird am Login unterschiedlich informiert: bei falschem Benutzername/Passwort "Anmeldung fehlgeschlagen!", nach zu vielen Fehlversuchen "Konto vorübergehend gesperrt! Bitte versuchen Sie es später erneut.", nach Ablauf der Sitzung während der Nutzung "Sitzung abgelaufen! Bitte erneut anmelden." und bei fehlender Berechtigung für eine aufgerufene Seite "Zugriff nicht erlaubt!".

![Sitzung abgelaufen](images/login-sitzung-abgelaufen.jpg)

## Navigation

Die linke Seitenleiste zeigt alle Menüpunkte, für die der angemeldete Benutzer berechtigt ist. Menüpunkte, die eine aktive Ausgabe voraussetzen (z. B. "Annahme", "Waren-Eingabe"), sind mit **INAKTIV** gekennzeichnet, solange kein Ausgabetag gestartet wurde. Untergeordnete Bereiche wie "Benutzer", "Statistiken" und "Einstellungen" lassen sich auf- und zuklappen. Über den Pfeil-Button unten in der Seitenleiste kann diese auf reine Icons eingeklappt werden, um mehr Platz für den Inhalt zu schaffen; auf schmalen Bildschirmen wird sie stattdessen über ein Hamburger-Menü ein-/ausgeblendet.

Die Menüstruktur gliedert sich in folgende Bereiche:

- **Anmeldung**: Annahme, Scanner, Ticket-Monitor
- **Kunden**: Kunden suchen, Kunden anlegen, sowie unter der aufklappbaren Gruppe "Sonstige": Kunden-Duplikate, Kunden über Limit, Kunden-Übersicht
- **Logistik**: Waren-Eingabe
- **Sonstige**: Benutzer, Statistiken, Einstellungen

Welche Menüpunkte sichtbar sind, hängt von den dem Benutzer zugewiesenen Berechtigungen ab (siehe [Benutzer](benutzer.md)).

Oben rechts in der Kopfzeile zeigt ein Badge **Live-Verbindung**, ob die Anwendung aktuell aktiv mit dem Server verbunden ist (z. B. relevant für Live-Updates wie den Ticket-Monitor); ist die Verbindung unterbrochen, wechselt der Status entsprechend. Unten in der Seitenleiste werden zudem die aktuelle Version und der Build-Zeitpunkt der Anwendung angezeigt.

<a id="übersicht-dashboard"></a>

## Übersicht (Dashboard)

Die Übersicht ist die Startseite und zeigt den aktuellen Status des Ausgabetags sowie Kennzahlen des Tages.

![Übersicht](images/dashboard.jpg)

- **Status**: Zeigt an, ob der Ausgabetag "Geöffnet" oder "Geschlossen" ist. Mit **Tag starten** wird eine neue Ausgabe begonnen, mit **Tag beenden** wird sie abgeschlossen (dabei werden u. a. die Mitarbeiterzahl und die genutzten Notschlafstellen abgefragt).
- **Kunden angemeldet**: Anzahl der für den heutigen Tag angemeldeten Kunden. Über **Kundenliste** kann die Liste der angemeldeten Kunden heruntergeladen werden.
- **Tickets abgearbeitet**: Fortschritt der Ticket-Bearbeitung (verarbeitete / gesamt).
- **Erfasste Routen (Anzahl/Details)** und **Erfasste Warenmenge**: Fortschritt der Warenerfassung aus der Logistik (siehe [Logistik](logistik.md)).
- **Statistik**: Eingabe der Mitarbeiteranzahl und der Personen in den ausgewählten Notschlafstellen für den Tagesreport. Die Anzahl der Personen in Notschlafstellen wird über den Rechner-Button neben dem Feld ermittelt, indem die genutzten Notschlafstellen ausgewählt werden.
- **Anmerkungen**: Freitext-Notizen zum aktuellen Ausgabetag, die z. B. im Tagesreport per E-Mail versendet werden.

Vor dem Beenden des Ausgabetags sollten Statistik und Anmerkungen vollständig ausgefüllt sein, da diese Angaben in den Tagesreport einfließen:

![Übersicht vor Tagesabschluss](images/dashboard-tagabschluss.jpg)

## Support-Anfrage

Über die Schaltfläche **Support-Anfrage** oben in der Kopfzeile kann jederzeit ein Anliegen (Fehler, Verbesserungsvorschlag) mit Titel und Beschreibung gemeldet werden. Die Anfrage wird direkt als GitHub-Issue angelegt.

![Support-Anfrage](images/support-anfrage.jpg)

## Fehlerseiten

Ist eine aufgerufene Seite nicht vorhanden, zeigt die Anwendung eine 404-Fehlerseite:

![404 – Seite nicht gefunden](images/fehlerseite-404.jpg)

Tritt bei einer Anfrage ein unerwarteter Serverfehler auf, zeigt die Anwendung eine 500-Fehlerseite. In diesem Fall über **Support-Anfrage** (siehe oben) melden.

![500 – Interner Server Fehler](images/fehlerseite-500.jpg)
