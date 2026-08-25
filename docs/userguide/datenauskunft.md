<a id="kapitel-datenauskunft"></a>

# Datenauskunft

Eine Datenschutz-Anfrage ("welche Daten sind über mich gespeichert?") kommt nicht vorab danach sortiert, ob die anfragende Person Kunde, Benutzerkonto-Inhaber:in oder Mitarbeiter:in ohne eigenes Konto ist. Bisher musste dafür geraten und anschließend auf bis zu drei verschiedenen Seiten unter drei verschiedenen Berechtigungen gesucht werden – bei einer Person, die sowohl Kunde als auch ehrenamtliche Mitarbeiterin ist (z. B. eine Fahrerin, die auch selbst Lebensmittel bezieht), sogar zweimal.

**Datenauskunft** durchsucht Kunden, Benutzerkonten und Mitarbeiter ohne Benutzerkonto mit einem einzigen Suchfeld und bietet für die gefundenen Treffer den Datenexport (DSGVO Art. 15/20) sowie die endgültige Löschung (DSGVO Art. 17) an – jeweils über denselben Ablauf, den die jeweilige Fachseite auch direkt anbietet.

> [!IMPORTANT]
> Für diese Seite ist die Berechtigung **Datenauskunft** erforderlich (siehe [Benutzer](benutzer.md)). Sie kommt **zusätzlich** zur Berechtigung des jeweiligen Bereichs hinzu: Um einen gefundenen Kunden-Treffer zu exportieren oder zu löschen, ist weiterhin "Kundenverwaltung" nötig, bei einem Benutzerkonto "Benutzerverwaltung" und bei einem Mitarbeiter ohne Konto "Einstellungen" – ein Treffer, für den die nötige Berechtigung fehlt, lässt sich nicht auswählen.

## Suchen und auswählen

Die Suche beginnt ab zwei eingegebenen Zeichen und wirkt sofort, ohne eigenen Suchen-Button. Gesucht wird nach Name, Kundennummer, Benutzername und Personalnummer, ebenso wie Adresse, Telefonnummer und E-Mail bei einem Kunden – auch bei Tippfehlern werden ähnlich geschriebene Treffer gefunden.

Die Treffer sind nach Bereich gruppiert – **Kunde**, **Benutzerkonto** und **Mitarbeiter ohne Konto** – damit eine Namensgleichheit zwischen einem Kunden und einer davon unabhängigen Mitarbeiterin nicht verwechselt werden kann. Ein Mitarbeiter, dem bereits ein Benutzerkonto zugeordnet ist, erscheint nur unter "Benutzerkonto": das Konto deckt seine Daten bereits vollständig ab, siehe [Mitarbeiter](einstellungen.md#mitarbeiter). Über die Kästchen lassen sich beliebig viele Treffer aus einer oder mehreren Gruppen gleichzeitig auswählen.

![Datenauskunft](images/datenauskunft.jpg)

## Daten exportieren

**Datenexport herunterladen** lädt für alle ausgewählten Treffer eine gemeinsame ZIP-Datei herunter – auch wenn nur ein einzelner Treffer ausgewählt ist. Sind eine Kunden- und eine Benutzerkonto-/Mitarbeiter-Auswahl gemeinsam ausgewählt (dieselbe Person, in beiden Rollen), enthält die ZIP-Datei beide vollständigen Auskünfte in getrennten Ordnern, statt zwei einzelne Downloads verlangen zu müssen. Inhaltlich entspricht jeder Ordner genau dem Export, den die jeweilige Fachseite auch einzeln anbietet – siehe [Kunden](kunden.md), [Benutzer](benutzer.md) bzw. [Mitarbeiter](einstellungen.md#mitarbeiter).

## Daten löschen

**Daten löschen** entfernt alle ausgewählten Treffer endgültig – über eine einzige Sicherheitsabfrage, die alle ausgewählten Einträge auflistet.

![Daten löschen bestätigen](images/datenauskunft-loeschen.jpg)

Anders als beim Export wirkt die Löschung auf jeden ausgewählten Treffer einzeln: Ist ein Kunde inzwischen bereits von jemand anderem gelöscht worden, hält das die Löschung der übrigen ausgewählten Treffer nicht auf. Jede Löschung läuft über denselben Ablauf wie auf der jeweiligen Fachseite, inklusive deren Einschränkungen – ein Mitarbeiter mit verknüpftem Benutzerkonto lässt sich also weiterhin nicht direkt löschen (siehe [Mitarbeiter](einstellungen.md#mitarbeiter)), und das letzte aktive Administrator-Benutzerkonto bleibt weiterhin geschützt (siehe [Benutzer](benutzer.md)).
