<a id="kapitel-logistik"></a>

# Logistik

Der Bereich "Logistik" begleitet die Routen-Teams: das **Routen-Navi** unterwegs auf der Route, die **Waren-Eingabe** bei der Erfassung der eingesammelten Warenmengen. Die Waren-Eingabe ist nur aktiv, solange ein Ausgabetag gestartet ist; das Routen-Navi ist jederzeit erreichbar, damit eine Route auch vorab durchgesehen werden kann.

<a id="routen-navi"></a>

## Routen-Navi

Unter **Logistik → Routen-Navi** wird über das Dropdown **Route auswählen** eine der aktiven Routen aus [Einstellungen → Routen](einstellungen.md#routen) gewählt; die zuletzt gewählte Route wird sich für dieses Gerät gemerkt und beim nächsten Aufruf gleich wieder vorausgewählt. Anschließend wird immer **ein Stopp** der Route angezeigt — die Seite wird am Steuer auf dem Handy gelesen, eine lange Liste wäre dort die falsche Darstellung. Die Reihenfolge ist die, in der die Stopps angefahren werden (nach der bei der Route hinterlegten Uhrzeit); beim Öffnen steht die Seite gleich beim ersten noch offenen Stopp. Über dem Stopp steht, der wievielte von wie vielen gerade angezeigt wird; eine Reihe von Punkten darüber zeigt zusätzlich auf einen Blick, welche Stopps schon erledigt, welcher gerade angezeigt und welche noch offen sind — durch Antippen eines Punkts wird direkt zu diesem Stopp gesprungen.

**Durchblättern und Abhaken sind zwei getrennte Vorgänge.** **Zurück** und **Weiter** zeigen nur den vorherigen bzw. nächsten Stopp an und verändern dabei nichts — ein Stopp kann also jederzeit noch einmal angesehen werden (etwa um einen Türcode nachzulesen), ohne den erfassten Fortschritt zu gefährden. Abgehakt wird ausschließlich über den eigenen, großen Knopf **Stopp erledigt** unterhalb der beiden Blätter-Knöpfe — er bezieht sich immer nur auf den gerade angezeigten Stopp. Ist ein Stopp bereits erledigt, steht an seiner Stelle **Rückgängig machen**, um das Abhaken für genau diesen Stopp wieder zurückzunehmen. Dieser Knopf bleibt beim Scrollen am unteren Bildschirmrand sichtbar, da er der Knopf ist, der unterwegs an jedem Stopp gedrückt wird.

Je Stopp werden angezeigt: Uhrzeit, Filialnummer und Name der Filiale, Adresse, Telefonnummer (per Klick direkt wählbar), Ansprechperson sowie eine allfällige Notiz zur Filiale. Stopps ohne Filiale — etwa eine Pause — bleiben erhalten und werden mit ihrer Beschreibung angezeigt. Der erste noch offene Stopp ist mit **Nächster offener Stopp** gekennzeichnet, ein bereits abgehakter mit **Erledigt**. Das **i-Symbol** neben der Überschrift blendet eine Kurzanleitung ein.

Die Abbildung zeigt die Seite so, wie sie unterwegs tatsächlich verwendet wird: am Handy (siehe auch [Darstellung auf schmalen Bildschirmen](README.md#darstellung-auf-schmalen-bildschirmen)). Am Computer ist es dieselbe Seite, nur breiter.

![Routen-Navi am Handy](images/logistik-routen-navi.jpg)

Hat die Route bei ihrer letzten Fahrt Retourware mitgebracht, steht oberhalb des Stopps ein Hinweis, wie viele Kisten heute zurückgehen und von welchem Ausgabetag sie stammen. Beim jeweiligen Stopp ist dann unter **Retourware abgeben** aufgelistet, was bei dieser Filiale abzugeben ist (z. B. "4 × Graue Kisten"). Kisten einer Filiale, die auf der Route inzwischen nicht mehr angefahren wird, werden im Hinweis oben gesondert unter "Ohne Stopp auf dieser Route" angeführt, damit sie nicht übersehen werden. Grundlage ist die zuletzt erfasste Retourware der Route aus der [Waren-Eingabe](#warenerfassung); der laufende Ausgabetag wird dabei nicht herangezogen.

Neben dem abgehakten Stopp werden Uhrzeit und Name der Person angezeigt, die ihn abgehakt hat. Der Zähler oben rechts zeigt den Fortschritt ("2 von 7 Stopps erledigt"), darunter derselbe Wert als Fortschrittsbalken.

Ist beim Abhaken keine Internetverbindung vorhanden, erscheint ein Banner "Offline" am oberen Bildschirmrand; das Abhaken selbst wird trotzdem sofort auf dem Bildschirm übernommen (mit dem Hinweis "Ausstehend" statt Uhrzeit/Name) und automatisch übertragen, sobald die Verbindung wieder da ist — es entfällt also nicht, nur weil unterwegs gerade kein Empfang ist. Solange die Seite mit einer Route mit Stopps geöffnet ist, wird außerdem verhindert, dass sich der Bildschirm des Geräts von selbst sperrt, damit zwischen zwei Stopps nicht jedes Mal erst entsperrt werden muss.

Sobald alle Stopps bis auf den letzten abgehakt sind, wird automatisch eine [Push-Benachrichtigung](README.md#benachrichtigungen) "Route beim letzten Stopp" verschickt, damit in der Zentrale bekannt ist, dass das Fahrzeug bald zurückkommt. Sie wird je Route einmal pro Tag verschickt.

Der abgehakte Fortschritt ist außerdem auf der [Übersicht](README.md#übersicht-dashboard) unter "Routen unterwegs" sichtbar — allerdings erst, sobald an diesem Tag der erste Stopp abgehakt wurde. Wird das Routen-Navi an einem Tag nicht verwendet, bleibt dieser Bereich der Übersicht ganz aus.

**Navigation starten** öffnet die Navigation zur jeweiligen Filiale in der Karten-App des Geräts (am Handy die installierte Karten-App, am Computer die Karte im Browser). Am Fortschritt ändert das nichts — abgehakt wird ausschließlich über die Knöpfe **Stopp erledigt**/**Rückgängig machen**.

**Restliche Route in Karte öffnen** unterhalb der Stopps übergibt gleich mehrere noch offene Stopps als eine Fahrt an die Karten-App. Bis zu zehn Stopps passen in eine solche Fahrt; sind noch mehr offen, steht darunter, wie viele Stopps danach einzeln zu navigieren sind.

Abgehakte Stopps gelten für den **jeweiligen Tag** und sind auch auf anderen Geräten sichtbar — ein zweites Handy oder die Zentrale sehen denselben Stand. Am nächsten Tag beginnt die Route wieder mit lauter offenen Stopps. Wird eine Route zwischenzeitlich unter [Einstellungen → Routen](einstellungen.md#routen) bearbeitet, geht der Fortschritt des Tages für diese Route verloren, da die Stopps dabei neu angelegt werden.

## Warenerfassung

Unter **Logistik → Waren-Eingabe** wird zunächst über das Dropdown **Route** die betreffende Route ausgewählt; zur Auswahl stehen alle aktiven Routen aus [Einstellungen → Routen](einstellungen.md#routen). Danach stehen zwei Reiter zur Verfügung. Der Button **Speichern** liegt unterhalb der Reiter und speichert immer die Eingaben beider Reiter — unabhängig davon, welcher Reiter gerade geöffnet ist.

Jeder Reiter trägt ein Symbol, das den Speicherstand seiner Eingaben zeigt: **✓ Vollständig** (grün, entspricht dem letzten gespeicherten Stand), **● Nicht gespeichert** (gelb, es gibt Änderungen seit dem letzten Speichern) oder **! Ungültig** (rot, Pflichtangaben fehlen oder sind fehlerhaft). Kein Symbol bedeutet, dass auf diesem Reiter noch nichts erfasst wurde. Wurden auf "Waren" bereits Mengen eingetragen, während auf "Route" KFZ/Fahrer/Beifahrer noch fehlen, erscheint zusätzlich ein Hinweis oberhalb der Reiter, dass diese Angaben beim Speichern übersprungen werden. Beim Verlassen der Seite mit ungespeicherten Änderungen — etwa über die Navigation — erscheint eine Sicherheitsabfrage, ob die Seite trotzdem verlassen werden soll.

### Reiter "Route"

Erfassung der Stammdaten der Route: verwendetes **Fahrzeug (KFZ)** sowie **Fahrer** und **Beifahrer** (Suche über Personalnummer oder Namen). Diese Daten werden üblicherweise bei der Abfahrt erfasst. Alle drei Felder sind Pflichtfelder — solange sie unvollständig sind, werden die Routendaten beim Speichern übersprungen (Hinweis "unvollständig und daher nicht gespeichert"), die übrigen Eingaben aber trotzdem gespeichert. Fahrer und Beifahrer müssen über die Mitarbeiter-Suche tatsächlich ausgewählt werden (freier Text allein genügt nicht, Hinweis "Bitte die Mitarbeiter-Suche starten"); über das X-Symbol kann eine bereits ausgewählte Person wieder entfernt werden. Wird kein passender Mitarbeiter gefunden, kann direkt aus der Suche heraus ein neuer Mitarbeiter angelegt werden. Wird eine bereits gespeicherte Route erneut ausgewählt, werden Fahrer und Beifahrer sofort angezeigt — die Mitarbeiter-Suche wird dafür nicht noch einmal ausgeführt.

![Route-Basisdaten](images/logistik-warenerfassung-route.jpg)

### Reiter "Waren"

#### Kilometerstand

Unter der Überschrift **Kilometerstand** wird der Stand bei Start/Ende erfasst — am Desktop am Beginn des Reiters, auf schmalen Bildschirmen ganz am Ende, da dort unterwegs Geschäft für Geschäft erfasst wird und der Kilometerstand erst bei der Rückkehr feststeht. Beide Werte werden erst eingetragen, wenn das Fahrzeug mit der Ware zurück ist — deshalb stehen sie hier und nicht bei den Stammdaten der Route. Die Angabe ist optional, es müssen aber immer beide Werte gemeinsam erfasst werden, und der Kilometerstand bei Ende muss größer sein als der bei Start; sobald beide Werte zueinander passen, wird die gefahrene Strecke direkt daneben eingeblendet ("→ 42 km"), sodass ein Zahlendreher beim Ablesen sofort auffällt. Übersteigt die Differenz 350 km, erscheint beim Speichern eine Sicherheitsabfrage ("Routenlänge überschritten... Ist das korrekt?"), die vor dem versehentlichen Erfassen einer falschen Strecke schützt.

#### Warenmenge

Darunter folgt — farblich abgesetzt — der Bereich **Warenmenge**: die tabellarische Erfassung der eingesammelten Menge (Anzahl Kisten/Einheiten) je Geschäft/Station der Route und Warenkategorie (z. B. Backwaren, Fleisch/Fisch, Getränke, Milchprodukte, Obst/Gemüse, Tiefkühlprodukte). Die Warenkategorien und deren Gewicht pro Einheit werden zentral unter [Einstellungen → Lebensmittelkategorien](einstellungen.md#lebensmittelkategorien) gepflegt; die Retourkisten haben eine eigene Liste unter [Retour-Kategorien](einstellungen.md#retourkategorien). Welche Geschäfte in welcher Reihenfolge angezeigt werden, ergibt sich aus den Stopps der Route; ob dort in Kisten oder in Kilogramm gezählt wird, hängt von der Einheit der jeweiligen [Filiale](einstellungen.md#filialen) ab. Zeilen mit einer ungültigen Eingabe werden rot hervorgehoben. Rechts steht je Warenkategorie die Summe über alle Geschäfte, unten je Geschäft die Summe über alle Kategorien, und ganz unten rechts die Gesamtsumme der Route — so ist auf einen Blick ersichtlich, ob die Menge ungefähr stimmt, ohne die Tabelle selbst zusammenzurechnen. Beim Scrollen einer größeren Tabelle bleiben die Kopfzeile (Geschäfte) und die erste Spalte (Warenkategorien) sichtbar, damit eine Zelle nie ihren Bezug verliert.

![Waren-Erfassung](images/logistik-warenerfassung-waren.jpg)

#### Retourware

Darunter folgt — in einem eigenen, andersfarbigen Bereich — die **Retourware** für die Kisten, die an die Filiale zurückgehen. Er besteht aus zwei Teilen:

- die geläufigen Kistenarten (z. B. "Graue Kisten", "Klappkisten schwarz", "Ströck Kisten") als vorgegebene Zähler je Geschäft, ebenfalls mit Summenspalte/-zeile und sichtbarer Kopfzeile/erster Spalte beim Scrollen wie bei der Warenmenge oben. Diese Liste wird unter [Einstellungen → Retour-Kategorien](einstellungen.md#retourkategorien) gepflegt
- **Sonstige Retourware** für alles, was in dieser Liste nicht vorkommt: über **Retourware hinzufügen** wird eine Zeile mit frei wählbarer **Beschreibung** (max. 100 Zeichen) und **Menge** angelegt; auf dem Desktop wird zusätzlich das Geschäft ausgewählt. Über das X-Symbol wird eine Zeile wieder entfernt.

![Retourware](images/logistik-warenerfassung-retourware.jpg)

Eine Beschreibung, die bereits als Zähler vorhanden ist oder für dasselbe Geschäft schon einmal eingetragen wurde, wird mit dem Hinweis "Beschreibung bereits erfasst" abgelehnt.

Die erfasste Retourware wird beim Beenden des Ausgabetags automatisch per E-Mail als Liste "Retourkisten" je Route und Geschäft versendet (Empfänger siehe [Einstellungen](einstellungen.md#kapitel-einstellungen)).

Mit **Speichern** wird die gesamte Erfassung übernommen. Die Gesamtmenge aller Routen fließt in die Kennzahlen "Erfasste Routen" und "Erfasste Warenmenge" auf der [Übersicht](README.md#übersicht-dashboard) ein.

### Warenerfassung auf schmalen Bildschirmen

Auf schmalen Bildschirmen (Smartphone/Tablet) wird die Warenerfassung nicht als Tabelle über alle Geschäfte dargestellt, sondern als Ablauf Geschäft für Geschäft: Es wird jeweils ein Geschäft/eine Station angezeigt, über **Vorherige**/**Nächste** wird geblättert, wobei automatisch zum nächsten noch nicht vollständig erfassten Geschäft gesprungen wird. Oberhalb der Filiale zeigt "Filiale 3 von 8", wie weit die Route bereits abgearbeitet ist; über das danebenliegende Auswahlfeld springt man direkt zu einer beliebigen Filiale der Route, mit einem Häkchen bei bereits vollständig erfassten Filialen. Ist für die angezeigte Filiale schon zu jeder Warenkategorie eine Menge größer 0 erfasst, erscheint neben ihrem Namen die Markierung "✓ erfasst". Die Warenkategorien werden dabei je Geschäft als Zähler mit **−**/**+** untereinander erfasst; zum schnellen Hochzählen größerer Mengen kann eine der beiden Schaltflächen gedrückt gehalten werden, sie wiederholt sich dann automatisch.

![Warenerfassung auf schmalen Bildschirmen](images/logistik-warenerfassung-mobil.jpg)

Jede Eingabe der Warenmenge wird sofort automatisch übernommen (kein separater Speichern-Button je Feld). Ist das Gerät offline, werden Änderungen zwischengespeichert und ein Banner "Offline - X Änderungen ausstehend" angezeigt; sobald die Verbindung wiederhergestellt ist, werden die ausstehenden Änderungen automatisch synchronisiert und kurz mit "Synchronisiert ✓" bestätigt.

Unterhalb der Warenmenge folgt die Retourware desselben Geschäfts – ebenfalls als Zähler, ohne eigene Geschäfts-Auswahl, da diese sich aus dem gerade angezeigten Geschäft ergibt. Sie wird beim Wechsel des Geschäfts und über **Speichern** übernommen. Ganz am Ende steht der **Kilometerstand**, der erst bei der Rückkehr feststeht.

![Retourware und Kilometerstand auf schmalen Bildschirmen](images/logistik-warenerfassung-mobil-retour-km.jpg)
