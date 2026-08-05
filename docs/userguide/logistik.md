<a id="kapitel-logistik"></a>

# Logistik

Der Bereich "Logistik" dient der Erfassung der von den Routen-Teams eingesammelten Warenmengen. Der Menüpunkt ist nur aktiv, solange ein Ausgabetag gestartet ist.

## Warenerfassung

Unter **Logistik → Waren-Eingabe** wird zunächst über das Dropdown **Route** die betreffende Route ausgewählt. Danach stehen zwei Reiter zur Verfügung:

### Reiter "Route"

Erfassung der Stammdaten der Route: verwendetes **Fahrzeug (KFZ)**, **Kilometerstand bei Start/Ende**, sowie **Fahrer** und **Beifahrer** (Suche über Personalnummer oder Namen). Alle Felder sind Pflichtfelder, der Kilometerstand bei Ende muss größer sein als der bei Start. Fahrer und Beifahrer müssen über die Mitarbeiter-Suche tatsächlich ausgewählt werden (freier Text allein genügt nicht, Hinweis "Bitte die Mitarbeiter-Suche starten"); über das X-Symbol kann eine bereits ausgewählte Person wieder entfernt werden. Wird kein passender Mitarbeiter gefunden, kann direkt aus der Suche heraus ein neuer Mitarbeiter angelegt werden.

![Route-Basisdaten](images/logistik-warenerfassung-route.jpg)

Übersteigt die Differenz zwischen Kilometerstand Start und Ende 350 km, erscheint beim Speichern eine Sicherheitsabfrage ("Routenlänge überschritten... Ist das korrekt?"), die vor dem versehentlichen Erfassen einer falschen Strecke schützt.

### Reiter "Waren"

Tabellarische Erfassung der eingesammelten Warenmenge (Anzahl Kisten/Einheiten) je Geschäft/Station der Route und Warenkategorie (z. B. Backwaren, Fleisch/Fisch, Getränke, Milchprodukte, Obst/Gemüse, Tiefkühlprodukte, Kisten sowie eigene Retour-Kategorien). Die Warenkategorien und deren Gewicht pro Einheit werden zentral unter [Einstellungen → Lebensmittelkategorien](einstellungen.md#lebensmittelkategorien) gepflegt. Zeilen werden je nach Gültigkeit der Eingabe rot bzw. grün hervorgehoben.

![Waren-Erfassung](images/logistik-warenerfassung-waren.jpg)

Mit **Speichern** wird die Erfassung übernommen. Die Gesamtmenge aller Routen fließt in die Kennzahlen "Erfasste Routen" und "Erfasste Warenmenge" auf der [Übersicht](README.md#übersicht-dashboard) ein.

Auf schmalen Bildschirmen (Smartphone/Tablet) wird die Warenerfassung stattdessen im Wizard-Modus dargestellt: Es wird jeweils ein Geschäft/eine Station angezeigt, über **Vorherige**/**Nächste** wird geblättert, wobei automatisch zum nächsten noch nicht vollständig erfassten Geschäft gesprungen wird. Jede Eingabe wird sofort automatisch übernommen (kein separater Speichern-Button je Feld). Ist das Gerät offline, werden Änderungen zwischengespeichert und ein Banner "Offline - X Änderungen ausstehend" angezeigt; sobald die Verbindung wiederhergestellt ist, werden die ausstehenden Änderungen automatisch synchronisiert.
