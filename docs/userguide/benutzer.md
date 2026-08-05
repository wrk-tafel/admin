<a id="kapitel-benutzer"></a>

# Benutzer

Im Bereich "Benutzer" werden die Zugänge und Berechtigungen der Mitarbeiterinnen und Mitarbeiter verwaltet. Der Menüpunkt ist nur für Benutzer mit der Berechtigung "Benutzerverwaltung" sichtbar.

## Benutzer suchen

Unter **Benutzer → Suchen** kann nach Personalnummer, Benutzername, Nachname und/oder Vorname gesucht werden. Standardmäßig werden nur aktive Benutzer angezeigt (Checkbox "Aktiv").

![Benutzer-Suche](images/benutzer-suchen.jpg)

Alternativ kann über das Feld "Personalnummer" (Button **Anzeigen**) direkt zur Detailansicht eines Benutzers gesprungen werden; ist die Personalnummer unbekannt, erscheint "Benutzer nicht gefunden!".

Das Suchergebnis zeigt Nummer, Name, Personalnummer und Status (Aktiv). Über die Aktionen kann der Benutzer angesehen (Lupe) oder bearbeitet (Stift) werden. Liefert die Suche keine Treffer, erscheint "Keine Benutzer gefunden!"; bei vielen Treffern kann über die Seitennavigation geblättert werden. Auf schmalen Bildschirmen wird das Ergebnis statt als Tabelle als Kartenliste dargestellt.

![Suchergebnis](images/benutzer-suchen-ergebnis.jpg)

## Benutzerdetails

Die Detailansicht zeigt Name, Benutzername, Personalnummer, ob eine Passwortänderung erforderlich ist, den Aktiv-Status sowie alle zugewiesenen Berechtigungen, gruppiert nach Kategorie (Ausgabe & Betrieb, Logistik, Leitung, Verwaltung).

![Benutzerdetails](images/benutzer-detail.jpg)

Über **Benutzer bearbeiten** gelangt man zur Bearbeitungsmaske. Über das Dropdown **Benutzer-Status ändern** kann der Benutzer aktiviert bzw. deaktiviert werden (je nach aktuellem Status wird nur die passende Option angezeigt); zusätzlich steht dort, getrennt durch eine Trennlinie, **Benutzer löschen** zur Verfügung, um den Benutzer unwiderruflich zu entfernen.

![Benutzer-Status ändern](images/benutzer-status-aendern.jpg)

## Benutzer anlegen / bearbeiten

Beim Anlegen bzw. Bearbeiten werden Benutzername, Personalnummer, Nachname, Vorname sowie optional ein Passwort erfasst (über **Passwort generieren** kann automatisch ein sicheres Passwort erzeugt werden); über das Augen-Symbol kann das eingegebene Passwort ein-/ausgeblendet werden. Benutzername, Personalnummer, Nach- und Vorname sind Pflichtfelder (max. 50 Zeichen); werden Passwort und Passwort-Wiederholung befüllt, müssen beide übereinstimmen. Beim Bearbeiten eines bestehenden Benutzers bleibt das aktuelle Passwort unverändert, solange die Passwortfelder leer gelassen werden. Zusätzlich kann festgelegt werden, ob der Benutzer aktiv ist und ob beim nächsten Login eine Passwort-Änderung erzwungen wird. Der Speichern-Button ist erst aktiv, sobald alle Pflichtfelder gültig ausgefüllt sind.

![Benutzer bearbeiten](images/benutzer-bearbeiten.jpg)

Im unteren Bereich werden die **Berechtigungen** einzeln oder je Kategorie ("Alle auswählen"/"Alle abwählen") vergeben. Die verfügbaren Berechtigungen sind u. a.:

| Kategorie | Berechtigungen |
|---|---|
| Ausgabe & Betrieb | Anmeldung, Ausgabe-Ablauf, Kundenverwaltung, Scanner |
| Logistik | Transport/Logistik |
| Leitung | Benutzerverwaltung, Einstellungen, Supervisor |
| Verwaltung | Kunden über dem Limit, Kunden-Duplikate, Kunden-Übersicht (Neu & Verlängert), Statistiken |

Beim Neuanlegen eines Benutzers ist standardmäßig keine Berechtigung ausgewählt und eine Passwort-Änderung beim ersten Login vorausgewählt.

![Benutzer erstellen](images/benutzer-erstellen.jpg)

## Anmelde-Versuche

Unter **Benutzer → Anmelde-Versuche** werden fehlgeschlagene Login-Versuche mit Benutzername, Anzahl der Fehlversuche, Zeitpunkt des letzten Fehlversuchs und Status (z. B. gesperrt bis) angezeigt. Nach mehreren fehlgeschlagenen Anmeldeversuchen wird ein Benutzerkonto automatisch vorübergehend gesperrt. Über den Papierkorb-Button kann der Eintrag gelöscht werden (mit Sicherheitsabfrage) – dabei wird eine bestehende Sperre ebenfalls aufgehoben; eine separate Funktion, die nur die Sperre entfernt und den Eintrag behält, gibt es nicht. Sind keine (aktuell gesperrten) Fehlversuche vorhanden, bleibt die Liste leer.

![Anmelde-Versuche](images/benutzer-anmeldeversuche.jpg)
