<a id="kapitel-einstellungen"></a>

# Einstellungen

Der Bereich "Einstellungen" bündelt die zentrale Konfiguration der Anwendung. Der Menüpunkt ist nur für Benutzer mit der Berechtigung "Einstellungen" sichtbar.

Die Tabellen dieses Bereichs werden auf schmalen Bildschirmen als Kartenliste dargestellt – eine Karte je Eintrag, mit denselben Angaben und denselben Aktionen wie in der Tabelle, inklusive Drag-Handle (⋮⋮) zum Sortieren (siehe [Darstellung auf schmalen Bildschirmen](README.md#darstellung-auf-schmalen-bildschirmen)). [Filialen](#filialen) und [Routen](#routen) sind keine Tabellen, sondern aufklappbare Listen und funktionieren daher auf jeder Bildschirmbreite gleich. Am Beispiel der Fahrzeuge:

![Einstellungen auf schmalen Bildschirmen](images/einstellungen-fahrzeuge-mobil.jpg)

## E-Mail-Empfänger

Unter **Einstellungen → E-Mail** werden die Empfänger (An/CC/BCC) für automatisch versendete E-Mails gepflegt, getrennt nach den Reitern **Tagesreport**, **Statistiken** und **Retourkisten**. Über die grünen **+**-Buttons können weitere Empfänger hinzugefügt, über die roten Buttons einzelne Empfänger entfernt werden. Jede Adresse muss ein gültiges E-Mail-Format haben; ungültige Einträge werden rot markiert (auch der jeweilige Reiter), zusätzlich erscheint die Meldung "Ungültige E-Mail Adresse".

![E-Mail-Empfänger](images/einstellungen-email.jpg)

Auf schmalen Bildschirmen stehen An, CC und BCC nicht nebeneinander, sondern durch Trennlinien getrennt untereinander.

Im Abschnitt "E-Mails erneut senden" kann für eine ausgewählte Ausgabe (Dropdown, standardmäßig die aktuellste) der zugehörige Tagesreport erneut versendet werden.

## Notschlafstellen

Unter **Einstellungen → Notschlafstellen** werden die Notschlafstellen verwaltet, deren Personenzahl in die Tagesstatistik einfließt. Notschlafstellen können aktiviert/deaktiviert, angesehen, bearbeitet und per Drag-Handle (⋮⋮) in der Reihenfolge sortiert werden. Eine deaktivierte Notschlafstelle kann erst wieder bearbeitet werden, nachdem sie reaktiviert wurde (der Stift-Button ist so lange deaktiviert).

![Notschlafstellen](images/einstellungen-notschlafstellen.jpg)

Neben Name und Adresse (inkl. optional Stiege/Tür) können ein freier **Hinweis**-Text sowie beliebig viele **Kontakte** (Vorname, Nachname, Telefonnummer als Pflichtfeld) über **Kontakt hinzufügen**/**Entfernen** erfasst werden. In der Ansehen-Ansicht werden alle Kontakte aufgelistet bzw. "Keine Kontakte vorhanden" angezeigt, falls keine erfasst sind.

![Notschlafstellen-Kontakte](images/einstellungen-notschlafstellen-kontakte.jpg)

<a id="statische-werte-grenzwerte"></a>

## Statische Werte (Grenzwerte)

Unter **Einstellungen → Statische Werte** werden die Einkommensgrenzen gepflegt, die bestimmen, ab welchem Einkommen ein Haushalt (abhängig von Anzahl Erwachsener und Kinder) nicht mehr bezugsberechtigt ist. Zusätzlich werden hier Zuschläge für zusätzliche Erwachsene/Kinder, eine Toleranz-Grenze sowie die altersabhängigen Sätze der Familienbeihilfe gepflegt. Es handelt sich um eine fest vorgegebene Liste von Werten (kein Hinzufügen/Entfernen einzelner Zeilen möglich) – bearbeitbar ist ausschließlich der jeweilige Betrag über Stift-/Häkchen-Symbol.

![Statische Werte](images/einstellungen-statische-werte.jpg)

Diese Werte sind die Grundlage für die Berechnung in [Kunden über Limit](kunden.md#kunden-über-limit).

<a id="lebensmittelkategorien"></a>

## Lebensmittelkategorien

Unter **Einstellungen → Lebensmittelkategorien** werden die Warenkategorien für die [Warenerfassung](logistik.md) gepflegt, inklusive des durchschnittlichen Gewichts pro Einheit (kg), das für die Hochrechnung der Gesamtwarenmenge verwendet wird. Kategorien können aktiviert/deaktiviert, bearbeitet und sortiert werden.

![Lebensmittelkategorien](images/einstellungen-lebensmittelkategorien.jpg)

<a id="retourkategorien"></a>

## Retour-Kategorien

Unter **Einstellungen → Retour-Kategorien** werden die geläufigen Kistenarten gepflegt, die im Abschnitt [Retourware](logistik.md#retourware) der Warenerfassung als Zähler vorgegeben werden. Sie haben — anders als Lebensmittelkategorien — kein Gewicht: Retourkisten werden nur gezählt, nie gewogen, und fließen daher auch nicht in die Warenmengen-Statistik ein. Kategorien können aktiviert/deaktiviert, bearbeitet und sortiert werden; die Reihenfolge bestimmt sowohl die Reihenfolge der Zähler in der Warenerfassung als auch die Reihenfolge in der Retourkisten-E-Mail.

Kisten, die hier nicht gelistet sind, müssen nicht angelegt werden — sie können in der Warenerfassung jederzeit als "Sonstige Retourware" mit freier Beschreibung erfasst werden.

![Retour-Kategorien](images/einstellungen-retourkategorien.jpg)

## Fahrzeuge

Unter **Einstellungen → Fahrzeuge** werden die für die Warenerfassung verfügbaren Fahrzeuge (Kennzeichen, Name) verwaltet. Fahrzeuge können aktiviert/deaktiviert, bearbeitet und sortiert werden.

![Fahrzeuge](images/einstellungen-fahrzeuge.jpg)

<a id="filialen"></a>

## Filialen

Unter **Einstellungen → Filialen** werden die Geschäfte gepflegt, bei denen Ware abgeholt wird. Neben Nummer, Name und Adresse werden Telefonnummer, Ansprechperson und ein freier **Hinweis**-Text erfasst.

Jede Filiale ist eine eigene Zeile, die sich aufklappen lässt: zugeklappt zeigt sie Nummer, Name, Adresse und Einheit, aufgeklappt die vollständigen Angaben inklusive Telefonnummer (als Link direkt wählbar), Ansprechperson und Hinweis. Über der Liste stehen ein **Suchfeld** (durchsucht Nummer, Name, Adresse, Ansprechperson und Hinweis) sowie der Filter **Alle / Aktiv / Inaktiv**; die Überschrift zeigt, wie viele der Filialen aktiv sind.

Die **Einheit** legt fest, wie die Menge dieser Filiale in der [Warenerfassung](logistik.md) gezählt wird: bei "Kisten" wird die eingegebene Anzahl mit dem Gewicht pro Einheit der jeweiligen [Lebensmittelkategorie](#lebensmittelkategorien) multipliziert, bei "Kilogramm" ist die Eingabe bereits das Gewicht. Eine falsche Einheit verfälscht daher alle Warenmengen-Statistiken dieser Filiale. Filialen, die in Kilogramm zählen, sind in der Liste farbig hervorgehoben.

Die **Nummer** muss eindeutig sein; ist sie bereits vergeben, erscheint beim Speichern die Meldung "Filialnummer ... ist bereits vergeben!".

![Filialen](images/einstellungen-filialen.jpg)

In der aufgeklappten Zeile wird die Filiale über den Schalter **Aktiv** aktiviert/deaktiviert und über **Bearbeiten** geändert. Eine deaktivierte Filiale steht in der Warenerfassung nicht mehr zur Auswahl, bleibt aber in bereits erfassten Ausgabetagen erhalten — deshalb gibt es bewusst keine Löschfunktion. Sie ist in der Liste als "Inaktiv" gekennzeichnet und kann erst wieder bearbeitet werden, nachdem sie reaktiviert wurde (der Bearbeiten-Button ist so lange deaktiviert).

<a id="routen"></a>

## Routen

Unter **Einstellungen → Routen** werden die Routen samt ihren Stopps gepflegt. Eine Route hat eine Nummer (Zwischennummern wie 2.1 sind möglich), einen Namen und einen freien **Hinweis**-Text.

Jede Route ist eine eigene Zeile, die sich aufklappen lässt: zugeklappt zeigt sie Nummer, Name sowie die Anzahl der Stopps und die Uhrzeit des ersten und letzten Stopps ("3 Stopps · 12:00 – 13:00"), aufgeklappt den Hinweis und den gesamten Tagesablauf der Route — je Stopp Uhrzeit, Filiale samt Adresse und Beschreibung. Über der Liste stehen ein **Suchfeld** (durchsucht Nummer, Name, Hinweis sowie die Filialen und Beschreibungen der Stopps) sowie der Filter **Alle / Aktiv / Inaktiv**.

![Routen](images/einstellungen-routen.jpg)

In der aufgeklappten Zeile wird die Route über den Schalter **Aktiv** aktiviert/deaktiviert und über **Bearbeiten** geändert. Im Bearbeiten-Dialog wird über **Stopp hinzufügen** je Stopp eine **Uhrzeit**, eine **Filiale** und eine **Beschreibung** erfasst; das Papierkorb-Symbol entfernt einen Stopp wieder. Die Uhrzeit bestimmt die Reihenfolge der Stopps — sowohl in der Routenliste als auch in der [Warenerfassung](logistik.md); eine eigene Sortierung per Drag & Drop gibt es hier daher nicht. Zur Auswahl stehen alle aktiven [Filialen](#filialen); mit "Keine Filiale" lässt sich auch ein Stopp ohne Warenabholung (z. B. eine Pause) eintragen — er wird in der Liste als "Ohne Filiale" geführt.

![Routen-Stopps](images/einstellungen-routen-stopps.jpg)

Pro Route darf jede Filiale nur einmal vorkommen und jede Uhrzeit nur einmal vergeben sein; andernfalls erscheint beim Speichern eine entsprechende Meldung. Wie bei den Filialen können Routen deaktiviert statt gelöscht werden: eine deaktivierte Route steht in der Warenerfassung nicht mehr zur Auswahl, bereits erfasste Ausgabetage bleiben aber unverändert.

## Mitarbeiter

Unter **Einstellungen → Mitarbeiter** werden die Mitarbeiterstammdaten (Personalnummer, Vorname, Nachname) verwaltet, auf denen die [Benutzerkonten](benutzer.md) sowie die Fahrer/Beifahrer-Zuordnung in der [Warenerfassung](logistik.md) basieren. Über die Suche (auch per Enter-Taste auslösbar) kann gezielt nach Mitarbeitern gefiltert werden. Anders als bei Notschlafstellen, Fahrzeugen und Lebensmittelkategorien gibt es hier keine Aktiv/Inaktiv-Kennzeichnung oder Löschfunktion, nur Anlegen und Bearbeiten. Beim Anlegen sind Personalnummer, Vorname und Nachname Pflichtfelder (max. 50 Zeichen).

![Mitarbeiter](images/einstellungen-mitarbeiter.jpg)
