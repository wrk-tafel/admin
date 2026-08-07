<a id="kapitel-einstellungen"></a>

# Einstellungen

Der Bereich "Einstellungen" bündelt die zentrale Konfiguration der Anwendung. Der Menüpunkt ist nur für Benutzer mit der Berechtigung "Einstellungen" sichtbar.

## E-Mail-Empfänger

Unter **Einstellungen → E-Mail** werden die Empfänger (An/CC/BCC) für automatisch versendete E-Mails gepflegt, getrennt nach den Reitern **Tagesreport**, **Statistiken** und **Retourkisten**. Über die grünen **+**-Buttons können weitere Empfänger hinzugefügt, über die roten Buttons einzelne Empfänger entfernt werden. Jede Adresse muss ein gültiges E-Mail-Format haben; ungültige Einträge werden rot markiert (auch der jeweilige Reiter), zusätzlich erscheint die Meldung "Ungültige E-Mail Adresse".

![E-Mail-Empfänger](images/einstellungen-email.jpg)

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

## Mitarbeiter

Unter **Einstellungen → Mitarbeiter** werden die Mitarbeiterstammdaten (Personalnummer, Vorname, Nachname) verwaltet, auf denen die [Benutzerkonten](benutzer.md) sowie die Fahrer/Beifahrer-Zuordnung in der [Warenerfassung](logistik.md) basieren. Über die Suche (auch per Enter-Taste auslösbar) kann gezielt nach Mitarbeitern gefiltert werden. Anders als bei Notschlafstellen, Fahrzeugen und Lebensmittelkategorien gibt es hier keine Aktiv/Inaktiv-Kennzeichnung oder Löschfunktion, nur Anlegen und Bearbeiten. Beim Anlegen sind Personalnummer, Vorname und Nachname Pflichtfelder (max. 50 Zeichen).

![Mitarbeiter](images/einstellungen-mitarbeiter.jpg)
