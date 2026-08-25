# Changelog

Diese Datei dokumentiert die nennenswerten Änderungen an Tafel Admin auf Deutsch, kurz und knapp gehalten. Jede neue Funktion oder Korrektur, die für Anwender:innen sichtbar ist, ergänzt hier einen Eintrag unter `## [Unreleased]`. Die Release-Pipeline übernimmt neu hinzugekommene Zeilen automatisch in die Release-Notes auf GitHub (siehe `release.yml` und CLAUDE.md, Abschnitt "Changelog").

Jeder Eintrag ist eine einzelne, nicht umgebrochene Zeile, die mit `- ` beginnt - die Release-Pipeline erkennt einen neuen Changelog-Eintrag genau daran.

## [Unreleased]
- In der Kundenansicht können unter "Weitere Aktionen" jetzt die vollständigen Kundendaten (Stammdaten, weitere Personen, Notizen, Teilnahme-Historie) als JSON-Datei sowie alle hochgeladenen Dokumente gesammelt als ZIP-Datei heruntergeladen werden, für die Beantwortung einer DSGVO-Auskunftsanfrage.

## [1.12.0] - 2026-08-25
- Beim Erfassen einer Notiz und beim Hochladen eines Dokuments erinnert jetzt ein Hinweis daran, nur für die Anspruchsprüfung notwendige Angaben zu erfassen - keine Angaben zu Gesundheit, Religion oder ähnlichen besonders schützenswerten Daten.
- Die Support-Anfrage weist jetzt im Dialog selbst darauf hin, bei einem Kundenanliegen die Kundennummer statt des Namens zu verwenden und die Kundenseite vor dem Öffnen zu verlassen, falls deren Inhalt nicht als Screenshot mitgeschickt werden soll.
- Das Änderungsprotokoll erfasst jetzt zusätzlich zu Änderungen auch eine kleine, gezielte Auswahl an Zugriffen auf sensible Kundendaten: den Download eines Dokuments, das Ansehen einer Scanner-Datei sowie die Erstellung des Stammdatenblatts, des Ausweises oder der Kundenliste einer Ausgabe.
- Administrator:innen werden jetzt per Push benachrichtigt, wenn ein Benutzerkonto innerhalb einer Stunde ungewöhnlich viele sensible Kundendaten abruft.
- Haushalte werden jetzt automatisch endgültig gelöscht (inkl. Personen, Notizen, Dokumenten und Ausgabe-Teilnahmen), sobald ihre Gültigkeit seit mehr als 7 Jahren abgelaufen ist.
- Benutzerkonten werden jetzt automatisch endgültig gelöscht, sobald sie sich seit mehr als 7 Jahren nicht mehr angemeldet haben (Administrator-Konten ausgenommen); Mitarbeiter:innen, auf die nirgends mehr verwiesen wird, werden nach 7 Jahren ebenso endgültig gelöscht.
- In der Kundenansicht kann jetzt unter "Daten ausdrucken" eine Datenschutzerklärung zum Ausdrucken und Unterschreiben heruntergeladen und nach der Unterschrift als eigener Dokumenttyp wieder hochgeladen werden.
- Bei der Kundensuche und in der Schnellsuche (Strg+K) kann die Datenschutzerklärung jetzt auch ohne Kundenbezug als Vorlage heruntergeladen werden, z. B. um sie einer Person schon vor der Kundenanlage zum Unterschreiben mitzugeben.
- Neuer Filter "Datenschutzerklärung fehlt" bei der Kundensuche, für Kunden ohne hochgeladene unterschriebene Datenschutzerklärung.
- Die Navigation in der Seitenleiste zeigt beim Überfahren mit der Maus jetzt wieder zuverlässig eine Hervorhebung an, auch auf Geräten, die fälschlicherweise als reine Touch-Geräte erkannt werden.

## [1.11.0] - 2026-08-24
- Mitarbeiter können jetzt jederzeit endgültig gelöscht werden; bereits erfasste Kundendaten, Notizen und Warenerfassungen, die auf einen gelöschten Mitarbeiter verweisen, zeigen stattdessen "Mitarbeiter gelöscht" an. Ist noch ein Benutzerkonto mit dem Mitarbeiter verknüpft, muss dieses zuerst entfernt werden.
- Kunden anlegen/bearbeiten warnt jetzt beim Speichern, wenn Name und Adresse einem bereits vorhandenen Kunden ähneln oder eine Person mit gleichem Namen und Geburtsdatum schon in einem anderen Haushalt erfasst ist - erst nach Bestätigung wird trotzdem gespeichert.

## [1.10.0] - 2026-08-24
- Die Release-Notes auf GitHub sind jetzt durchgehend auf Deutsch und enthalten wieder einen Link zum vollständigen Änderungsprotokoll.
- E-Mail-Empfänger: Entfernen eines bereits gespeicherten Empfängers wirkt jetzt sofort, ohne "Speichern".
- Fahrzeuge: ein noch nie in einer Warenerfassung verwendetes Fahrzeug kann jetzt endgültig gelöscht werden.

## [1.9.0] - 2026-08-22
- Übersicht: solange keine Ausgabe läuft, füllt eine Zusammenfassung der letzten Ausgabe (Kunden, Personen, Tickets, Warenmenge, Notschlafstellen) zusammen mit organisationsweiten Kennzahlen (Haushalte, Personen, Benutzer, Fahrzeuge, Notschlafstellen, Routen, Filialen, Mitarbeiter:innen) die Seite, statt leere Tageskacheln zu zeigen.

## [1.8.1] - 2026-08-21
- Interne Wartungsarbeiten (Dokumentation, Abhängigkeiten), keine sichtbaren Funktionsänderungen.

## [1.8.0] - 2026-08-17
- Einheitliches visuelles Design für E-Mails (Layout, Kopf- und Fußbereich).
- Einheitliches visuelles Design für alle PDF-Vorlagen (Ausweis, Stammdaten, Tagesbericht, Kundenliste).

## [1.7.0] - 2026-08-16
- Icons wurden von FontAwesome auf Material Symbols umgestellt (einheitlicheres Erscheinungsbild).
- Kundensuche: neuer Filter "Gesperrt"; der angezeigte Mitarbeitername wird synchron gehalten.
- Das Benutzermenü verlinkt direkt auf die aktuelle Version des Benutzerhandbuchs.
- Berechtigungsänderungen wirken jetzt sofort, ohne erneute Anmeldung.
- Routen-Navi springt automatisch zum nächsten Stopp, sobald einer abgeschlossen ist.
- Erfolgreiche Anmeldungen und der letzte Login-Zeitpunkt eines Benutzers werden protokolliert.

## [1.6.0] - 2026-08-15
- Umfassende UX/UI-Überarbeitung fast aller Bildschirme: Anmeldung, Passwort-Änderung, Fehlerseiten (404/500), Dashboard, Kundenbereich, Checkin/Scanner/Ticket-Monitor, Benutzerverwaltung, Einstellungen, Statistiken, Änderungsprotokoll und die Anwendungsnavigation.
- Neuer Einkommens-Schnellcheck, um die Anspruchsberechtigung vor der vollständigen Kundenanlage zu prüfen.
- Globale Schnellsuche (Strg+K) für Kunden und Navigation.
- Statistiken: Vergleich mit der Vorperiode sowie das laufende Jahr als Zeitraum.
- Änderungsprotokoll: Filter bleiben beim Blättern aktiv, Einträge werden nach Tag gruppiert.
- Familienbeihilfe-Stufe und Berechnung des Einkommens-Limits werden nachvollziehbar angezeigt.
- Geplante Wartungsjobs laufen nur noch einmal pro Serververbund statt je Instanz.
- Fehlgeschlagene E-Mails im Postausgang werden nach 30 Tagen automatisch gelöscht.

## [1.5.0] - 2026-08-10
- Routenführung umbenannt in "Routen-Navi", führt Fahrer:innen Stopp für Stopp inklusive Retourware.
- Dashboard zeigt den Fortschritt jeder Route.
- Support-Anfragen werden als E-Mail (mit Kontext und Screenshot) über einen Mail-Postausgang verschickt.
- Neues Änderungsprotokoll: Änderungen an Kunden, Personen, Benutzern u. a. werden nachvollziehbar protokolliert, inklusive Ansicht direkt am Kunden.
- Bei der Ersteinrichtung wird automatisch ein Administrator-Konto angelegt.
- Filialen und Routen werden in den Einstellungen als aufklappbare Listen verwaltet.
- Push-Benachrichtigungen für die Phasen eines Ausgabetags, mit Berechtigungssteuerung und Deep-Links.
- Neue Berechtigung "Administrator"; das letzte aktive Administrator-Konto kann nicht mehr entfernt werden.
- Kunden- und Benutzersuche nutzen jetzt eine unscharfe Volltextsuche über ein einziges Suchfeld.
- Tooltips für Icon-Buttons und Erklärungen zu Fachbegriffen ergänzt.

## [1.4.2] - 2026-08-08
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [1.4.1] - 2026-08-08
- Zuverlässigkeitskorrekturen: Server-Push-Verbindungen (SSE) verbinden sich nach einer Unterbrechung automatisch neu, verpasste Ereignisse werden nachgeliefert.
- Abmeldung: die Seite bleibt bis zur Weiterleitung sichtbar.
- Sperren-Fehler bei gleichzeitigen Ausgaben-Aktionen behoben.

## [1.4.0] - 2026-08-08
- Serverkonfiguration kann ohne Neustart der Anwendung aktualisiert werden.
- Der optionale Scanner-Ordner sowie die Umgebungskennzeichnung lassen sich pro Umgebung ein- und ausschalten.
- Warenerfassung: freie Retour-Positionen in einem eigenen Bereich mit einem gemeinsamen Speichern-Button; Retour-Kategorien werden in den Einstellungen verwaltet.
- Ladebildschirm zeigt App-Name und Umgebung.

## [1.3.0] - 2026-08-07
- Neu: optionale Web-Push-Benachrichtigungen, u. a. beim Start und Abschluss einer Ausgabe, inklusive eigener Geräteverwaltung mit Test-Benachrichtigung.

## [1.2.0] - 2026-08-07
- Anmeldeversuche wurden vom Bereich Einstellungen in den Bereich Benutzer verschoben.
- App-Titel und PWA-Symbol lassen sich pro Umgebung anpassen (Branding).
- Verbessertes Logging für Ausgaben-, Anmelde- und Kundenaktionen.

## [1.1.0] - 2026-08-05
- Neue Kunden-Übersicht: neue und erneuerte Haushalte je Ausgabe.
- Kunden-Unterseiten in der Navigation zu einer aufklappbaren Gruppe zusammengefasst.

## [1.0.2] - 2026-08-05
- Technische Umstellung der Web-Adressen (kein `#` mehr in der URL); bestehende Lesezeichen auf alte `#`-URLs sollten neu gesetzt werden.

## [1.0.1] - 2026-08-04
- Fehlerbehebung beim automatisierten Erstellen des Benutzerhandbuch-PDFs, kein Unterschied für Anwender:innen.

## [1.0.0] - 2026-08-04
- Offene Unkostenbeiträge können direkt am Ticket-Monitor beglichen werden.
- Dashboard zählt und listet nur vollständig erfasste Routen.
- Zusammenführen von Kundendubletten überarbeitet: Feld-für-Feld-Auswahl inklusive Übernahme von Personen, Notizen und Verlauf.
- Kombiniertes Kunden-PDF (Ausweis und Stammdaten) entfernt; verwaiste Dokumentdateien werden automatisch bereinigt.
- Dokumenten-Upload für Haushalte, inklusive Einbindung des Scanner-Ordners.
- Neue Einstellungsseite für Anmeldeversuche (mit Entsperren) und für Mitarbeiter:innen (mit Seitenweise-Anzeige).
- Neuer In-App-Support-Kontakt, der eine Meldung an das Entwicklungsteam erstellt.
- Warenerfassung ist als installierbare Web-App auch offline nutzbar.

## [0.5.0] - 2026-07-30
- Neue Verwaltungsseite für Fahrzeuge in den Einstellungen.

## [0.4.4] - 2026-07-30
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.4.3] - 2026-07-30
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.4.2] - 2026-07-29
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.4.1] - 2026-07-29
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.4.0] - 2026-07-29
- Berechtigungen werden bei Benutzern nun nach Kategorie gruppiert dargestellt (Anlage, Bearbeitung, Detailansicht).

## [0.3.2] - 2026-07-29
- Interne Wartungsarbeiten, keine sichtbaren Funktionsänderungen.

## [0.3.1] - 2026-07-29
- Anmeldeseite überarbeitet (Design, Autofill- und Enter-Tasten-Fehler behoben).
- Diverse kleinere UI-Korrekturen (Dialog-Kontrast, Kategorie-Umbenennung).

## [0.3.0] - 2026-07-29
- Allgemeine Verbesserungen am visuellen Erscheinungsbild.

## [0.2.1] - 2026-07-29
- Verbleibende Formulare von CoreUI auf Angular Material umgestellt.
- Kleinere Layout-Korrekturen (Tab-Ausrichtung, Kartenhöhen, Alleinerzieher-Feld).
- Release-Notes auf GitHub zeigen jetzt den Docker-Image-Verweis.

## [0.2.0] - 2026-07-28
- Neues Merkmal "Alleinerzieher" je Haushalt, inklusive Anzeige am Kunden und im Tagesbericht.

## [0.1.0] - 2026-07-28
- Erstes Release: automatisierte Versionsvergabe (SemVer) und Anzeige der laufenden Version in der Seitenleiste.
