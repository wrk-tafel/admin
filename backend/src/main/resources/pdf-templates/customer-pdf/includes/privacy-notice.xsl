<?xml version="1.0" encoding="UTF-8"?>
<!--
    Printable consent form (GDPR G2, issue #3177; recipients/third-country/mandatory-voluntary/
    Art. 13(2)(f) paragraphs and the retentionYears parameter added for gap G20, issue #3429): what
    an operator hands the customer at intake to read and sign, filed outside the application - there
    is no stored consent field, this document is the whole record. See
    docs/architecture/gdpr-compliance.md (G2, G20) and issue #3185.

    Controller identity, DPO contact and the rights/complaints wording below are taken from the
    organisation's own published privacy notice (https://www.roteskreuz.at/wien/ich-will-mehr-wissen/
    datenschutzerklaerung, checked 2026-08-25) - that page has no section covering Team-Österreich-
    Tafel/aid-recipient data at all, so the purpose, legal-basis, recipients, third-country-transfer,
    retention (matches HouseholdRetentionService's actual window, passed in as retentionYears rather
    than hard-coded), mandatory/voluntary and automated-decision paragraphs are written specifically
    for this intake flow, grounded in what docs/architecture/gdpr-compliance.md §1/§2/§5 record this
    application actually does, rather than copied from an existing approved Tafel-specific notice,
    since none exists yet. Reviewing that against the live page - and against whatever the operator's
    own legal/DPO process requires before a customer-facing document goes live - is still worth doing
    before relying on it; see issue #3185.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>

    <xsl:template name="privacy-notice">
        <!-- id="main" is what the document's own page-number-citation-last (footer "Seite X von Y") targets. -->
        <fo:block font-family="Helvetica" start-indent="0pt" end-indent="0pt" id="main">
            <xsl:call-template name="privacy-notice-header"/>
            <fo:block space-after="4mm">
                <xsl:call-template name="privacy-notice-body"/>
            </fo:block>
            <xsl:call-template name="privacy-notice-consent-statement"/>
            <xsl:call-template name="privacy-notice-signature"/>
        </fo:block>
    </xsl:template>

    <xsl:template name="privacy-notice-header">
        <!--
            Blank for the reference-less template (HouseholdPdfService.generatePrivacyNoticeTemplatePdf)
            - there is no household to reference, so the "Kundennummer" line is omitted entirely rather
            than shown blank.
        -->
        <xsl:variable name="subtitle">
            <xsl:if test="normalize-space(./householdId) != ''">
                <xsl:value-of select="concat('Kundennummer ', ./householdId)"/>
            </xsl:if>
        </xsl:variable>
        <xsl:call-template name="document-header">
            <xsl:with-param name="title" select="'Datenschutzerklärung und Einwilligung'"/>
            <xsl:with-param name="subtitle" select="$subtitle"/>
            <xsl:with-param name="logoContentType" select="./logoContentType"/>
            <xsl:with-param name="logoBytes" select="./logoBytes"/>
        </xsl:call-template>
    </xsl:template>

    <xsl:template name="privacy-notice-body">
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Welche Daten wir verarbeiten und warum'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="3mm" line-height="1.4">
            Wir verarbeiten Ihre Stammdaten (Name, Geburtsdatum, Adresse, Kontaktdaten), Angaben zu
            Ihrem Haushalt sowie von Ihnen vorgelegte Nachweise (z. B. Einkommensnachweise,
            Ausweiskopien), um Ihre Anspruchsberechtigung im Rahmen des Projekts „Team Österreich
            Tafel" zu prüfen und die Ausgabe von Lebensmitteln zu organisieren.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Rechtsgrundlage'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="3mm" line-height="1.4">
            Die Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die
            Sie mit Ihrer Unterschrift auf diesem Blatt erteilen. Sie können Ihre Einwilligung
            jederzeit mit Wirkung für die Zukunft widerrufen, etwa durch formlose Mitteilung an die
            unten genannte Kontaktadresse; dies berührt nicht die Rechtmäßigkeit der bis zum Widerruf
            erfolgten Verarbeitung.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Empfänger und Kategorien von Empfängern'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="3mm" line-height="1.4">
            Ihre Daten werden nicht an Dritte verkauft. Zugriff haben nur von uns beauftragte
            Auftragsverarbeiter (Art. 28 DSGVO): unser Hosting-Anbieter und der Anbieter, über den
            wir automatisierte E-Mails versenden - beide ausschließlich nach unserer Weisung.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Datenübermittlung in Drittländer'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="3mm" line-height="1.4">
            Eine Übermittlung Ihrer Daten in Länder außerhalb der EU/des EWR findet nicht statt. (Für
            interne Mitarbeiter-Benachrichtigungen nutzen wir Push-Dienste außereuropäischer
            Anbieter, die dabei nur verschlüsselte technische Zustelldaten sehen - keine Ihrer Daten.)
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Speicherdauer'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="3mm" line-height="1.4">
            Ihre Daten werden gelöscht, sobald Ihre Anspruchsberechtigung seit mehr als
            <xsl:value-of select="./retentionYears"/> Jahren abgelaufen ist.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Pflichtangabe und Folgen der Nichtbereitstellung'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="3mm" line-height="1.4">
            Die Angabe Ihrer Daten ist freiwillig, aber Voraussetzung für die Prüfung Ihrer
            Anspruchsberechtigung; ohne vollständige Angaben und Nachweise können wir Sie nicht im
            Rahmen des Projekts „Team Österreich Tafel" berücksichtigen.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Automatisierte Entscheidungsfindung'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="3mm" line-height="1.4">
            Es findet keine automatisierte Entscheidungsfindung nach Art. 22 DSGVO statt. Die
            Anspruchsgrenze berechnet unser System nur als Vorschlag; über Ihre Berechtigung
            entscheidet stets ein Mitglied unseres Teams.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Ihre Rechte und Kontakt'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" line-height="1.4">
            Sie haben das Recht auf Auskunft über die Sie betreffenden personenbezogenen Daten (Art. 15
            DSGVO), ein Recht auf Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO) und auf
            Einschränkung der Verarbeitung (Art. 18 DSGVO), ein Widerspruchsrecht gegen die
            Verarbeitung (Art. 21 DSGVO) sowie das Recht auf Datenübertragbarkeit (Art. 20 DSGVO). Sie
            können diese Rechte jederzeit bei uns geltend machen und haben zudem das Recht auf
            Beschwerde bei der österreichischen Datenschutzbehörde (Barichgasse 40–42, 1030 Wien).
        </fo:block>
        <fo:block font-size="10pt" color="{$tafelInk}" space-before="3mm" line-height="1.4">
            Verantwortlicher: Österreichisches Rotes Kreuz, Landesverband Wien, Nottendorfergasse 21,
            1030 Wien. Kontakt für Anliegen zum Datenschutz: datenschutz@wrk.at, Tel. 050 144.
        </fo:block>
    </xsl:template>

    <xsl:template name="privacy-notice-consent-statement">
        <fo:block background-color="{$tafelAccentTint}" padding="3mm" space-before="3mm" space-after="6mm">
            <fo:block font-size="10pt" font-weight="bold" color="{$tafelInk}">
                Ich habe die Datenschutzerklärung gelesen und verstanden und willige der Verarbeitung
                meiner personenbezogenen Daten für die oben genannten Zwecke ein.
            </fo:block>
        </fo:block>
    </xsl:template>

    <xsl:template name="privacy-notice-signature">
        <fo:table table-layout="fixed" width="100%" space-before="8mm">
            <fo:table-column column-width="40%"/>
            <fo:table-column column-width="30%"/>
            <fo:table-column column-width="30%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell padding-right="5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="./fullName"/>
                            <xsl:with-param name="label" select="'Name (Hauptbezieher/-in)'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                    <fo:table-cell padding-right="5mm">
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="./issuedAtDate"/>
                            <xsl:with-param name="label" select="'Ort, Datum'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                    <fo:table-cell>
                        <xsl:call-template name="field-with-label">
                            <xsl:with-param name="value" select="''"/>
                            <xsl:with-param name="label" select="'Unterschrift'"/>
                        </xsl:call-template>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
</xsl:stylesheet>
