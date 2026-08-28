<?xml version="1.0" encoding="UTF-8"?>
<!--
    The Art. 13 GDPR privacy notice for staff (GDPR gap G20, issue #3429; the client-IP paragraph
    and its ipLockoutDurationText parameter added for gap G27, issue #3509) - unlike the customer
    notice (customer-pdf/includes/privacy-notice.xsl), this is purely informational rather than a
    consent form: legal basis here is legitimate interest/the underlying service or volunteer
    relationship, not consent, so there is nothing to sign. Generic, not per-person - reachable
    without a specific user or employee record, the same "reference-less template" shape as the
    customer notice's own blank counterpart, since informing staff what is processed about them
    does not need any one person's data filled in.

    Controller identity, DPO contact and the rights/complaints wording are the same text as the
    customer notice, taken from the organisation's own published privacy notice
    (https://www.roteskreuz.at/wien/ich-will-mehr-wissen/datenschutzerklaerung, checked 2026-08-25).
    The purpose, legal-basis, recipients, third-country-transfer, retention, mandatory/voluntary and
    automated-decision paragraphs are written specifically for this application, grounded in what
    docs/architecture/gdpr-compliance.md §1/§2/§5 record it actually does with staff data - reviewing
    that against the operator's own legal/DPO process before relying on it is still worth doing, see
    issue #3185.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>

    <xsl:template name="staff-privacy-notice">
        <!-- id="main" is what the document's own page-number-citation-last (footer "Seite X von Y") targets. -->
        <fo:block font-family="Helvetica" start-indent="0pt" end-indent="0pt" id="main">
            <xsl:call-template name="document-header">
                <xsl:with-param name="title" select="'Datenschutzerklärung für Mitarbeiter:innen und Freiwillige'"/>
                <xsl:with-param name="subtitle" select="concat('Stand ', ./issuedAtDate)"/>
                <xsl:with-param name="logoContentType" select="./logoContentType"/>
                <xsl:with-param name="logoBytes" select="./logoBytes"/>
            </xsl:call-template>
            <xsl:call-template name="staff-privacy-notice-body"/>
        </fo:block>
    </xsl:template>

    <xsl:template name="staff-privacy-notice-body">
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Welche Daten wir verarbeiten und warum'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            Wir verarbeiten Ihre Stammdaten (Name, Personalnummer, Benutzername), Ihre
            Zugriffsberechtigungen, Anmeldedaten (Zeitpunkt erfolgreicher und fehlgeschlagener
            Anmeldungen sowie bei einer fehlgeschlagenen Anmeldung die IP-Adresse, von der aus die
            Anmeldung erfolgte, auch zur Begrenzung der Anfragehäufigkeit) sowie - sofern Sie diese
            Funktion aktivieren - Ihre für Push-Benachrichtigungen registrierten Geräte, um Ihnen den
            Zugang zur Anwendung „Tafel Admin" zu ermöglichen, Ihnen Zugriffsrechte entsprechend
            Ihrer Tätigkeit zu vergeben, Änderungen an Kunden- und Stammdaten nachvollziehbar Ihrem
            Konto zuzuordnen (Änderungsprotokoll), missbräuchliche Anmeldeversuche zu erkennen und
            abzuwehren und Sie bei Bedarf über wichtige Ereignisse zu benachrichtigen.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Rechtsgrundlage'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            Die Verarbeitung erfolgt auf Grundlage unseres berechtigten Interesses (Art. 6 Abs. 1
            lit. f DSGVO) an einem sicheren, funktionsfähigen und nachvollziehbaren Betrieb der
            Anwendung im Rahmen Ihrer Tätigkeit sowie - soweit einschlägig - auf Grundlage der
            Erfüllung des zugrundeliegenden Dienst- bzw. Freiwilligenverhältnisses (Art. 6 Abs. 1
            lit. b DSGVO).
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Empfänger und Kategorien von Empfängern'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            Zugriff auf Ihre Daten haben ausschließlich von uns beauftragte Dienstleister, die für
            uns als Auftragsverarbeiter im Sinne des Art. 28 DSGVO tätig sind: der Betreiber der
            technischen Infrastruktur (Hosting der Anwendung und der Datenbank) und - sofern Sie
            Push-Benachrichtigungen aktivieren - die Push-Dienste der jeweiligen Gerätehersteller
            (z. B. Google, Mozilla, Apple), denen dabei ausschließlich ein verschlüsseltes
            Gerätekennzeichen, keine Ihrer Daten im Klartext, bekannt wird.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Datenübermittlung in Drittländer'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            Sofern Sie Push-Benachrichtigungen aktivieren, wird dabei ein Gerätekennzeichen an den
            jeweiligen Push-Dienst übermittelt, dessen Anbieter (z. B. Google, Mozilla, Apple) auch
            außerhalb der EU/des EWR, insbesondere in den USA, verarbeiten kann. Der Inhalt der
            Benachrichtigung ist dabei für den Diensteanbieter verschlüsselt und nicht lesbar. Ohne
            Aktivierung dieser Funktion findet keine Übermittlung Ihrer Daten in Drittländer statt.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Speicherdauer'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            Ihr Benutzerkonto wird gelöscht, wenn Sie sich seit mehr als
            <xsl:value-of select="./userRetentionText"/> nicht mehr angemeldet haben, oder zuvor auf
            Ihren Wunsch bzw. bei Beendigung Ihrer Tätigkeit manuell. Ihr verknüpfter
            Mitarbeiter-Datensatz (Personalnummer, Name) bleibt bestehen, solange er noch an anderer
            Stelle referenziert wird (z. B. als Erfasser:in eines Haushalts oder einer Notiz, oder
            als Fahrer:in einer Warenerfassung), und wird danach spätestens nach
            <xsl:value-of select="./employeeRetentionText"/> automatisch entfernt. Einträge im
            Änderungsprotokoll, die Ihr Konto betreffen, werden nach
            <xsl:value-of select="./auditRetentionDays"/> Tagen gelöscht. Die bei einer
            fehlgeschlagenen Anmeldung gespeicherte IP-Adresse wird spätestens
            <xsl:value-of select="./ipLockoutDurationText"/> nach dem letzten fehlgeschlagenen
            Anmeldeversuch, jedenfalls aber innerhalb der folgenden Stunde, automatisch gelöscht.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Pflichtangaben und Folgen der Nichtbereitstellung'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            Die Angabe Ihrer Stammdaten und die Einrichtung eines Benutzerkontos sind Voraussetzung
            für die Nutzung der Anwendung; ohne diese Daten können wir Ihnen keinen Zugang gewähren.
            Die Aktivierung von Push-Benachrichtigungen ist freiwillig und kann jederzeit über Ihre
            Benachrichtigungseinstellungen widerrufen werden, ohne dass dies Ihren Zugang zur
            Anwendung einschränkt.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Automatisierte Entscheidungsfindung'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            Es findet keine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne des
            Art. 22 DSGVO statt, die Ihnen gegenüber rechtliche Wirkung entfaltet oder Sie in
            ähnlicher Weise erheblich beeinträchtigt. Ein automatisiertes System meldet ungewöhnlich
            hohe Zugriffszahlen auf Kundendaten zur Überprüfung an Administrator:innen; die Bewertung
            und etwaige Konsequenzen daraus erfolgen ausschließlich durch einen Menschen.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Ihre Rechte und Kontakt'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" line-height="1.5">
            Sie haben das Recht auf Auskunft über die Sie betreffenden personenbezogenen Daten (Art. 15
            DSGVO), ein Recht auf Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO) und auf
            Einschränkung der Verarbeitung (Art. 18 DSGVO), ein Widerspruchsrecht gegen die
            Verarbeitung (Art. 21 DSGVO) sowie das Recht auf Datenübertragbarkeit (Art. 20 DSGVO). Sie
            können diese Rechte jederzeit bei uns geltend machen und haben zudem das Recht auf
            Beschwerde bei der österreichischen Datenschutzbehörde (Barichgasse 40–42, 1030 Wien).
        </fo:block>
        <fo:block font-size="10pt" color="{$tafelInk}" space-before="3mm" line-height="1.5">
            Verantwortlicher: Österreichisches Rotes Kreuz, Landesverband Wien, Nottendorfergasse 21,
            1030 Wien. Kontakt für Anliegen zum Datenschutz: datenschutz@wrk.at, Tel. 050 144.
        </fo:block>
    </xsl:template>
</xsl:stylesheet>
