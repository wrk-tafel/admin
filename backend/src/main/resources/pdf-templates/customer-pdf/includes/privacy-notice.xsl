<?xml version="1.0" encoding="UTF-8"?>
<!--
    Printable consent form (GDPR G2, issue #3177): what an operator hands the customer at intake to
    read and sign, filed outside the application - there is no stored consent field, this document is
    the whole record. The notice text below is a PLACEHOLDER - it must be replaced with the operator's
    actual privacy-notice text (legal basis, purposes, retention, contact) before this document is
    used with real customers. See docs/architecture/gdpr-compliance.md (G2) and issue #3185.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>

    <xsl:template name="privacy-notice">
        <fo:block font-family="Helvetica" start-indent="0pt" end-indent="0pt">
            <xsl:call-template name="privacy-notice-header"/>
            <xsl:call-template name="privacy-notice-placeholder-banner"/>
            <fo:block space-after="5mm">
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

    <!-- Impossible to miss when printed - the operator has to actively remove this before rollout. -->
    <xsl:template name="privacy-notice-placeholder-banner">
        <fo:block background-color="{$tafelAccentTint}" border="0.4mm solid {$tafelAccent}" padding="3mm"
                  space-after="5mm">
            <fo:block font-weight="bold" font-size="10pt" color="{$tafelInk}" space-after="1mm">
                PLATZHALTERTEXT - vor Verwendung durch den tatsächlichen Text der Organisation ersetzen
            </fo:block>
            <fo:block font-size="8.5pt" color="{$tafelMuted}">
                Der folgende Text ist ein Beispieltext und keine rechtsverbindliche Datenschutzerklärung.
                Verantwortungsbereich, Zwecke, Rechtsgrundlage, Speicherdauer und Kontaktdaten müssen vom
                Betreiber festgelegt und hier eingetragen werden.
            </fo:block>
        </fo:block>
    </xsl:template>

    <xsl:template name="privacy-notice-body">
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Welche Daten wir verarbeiten und warum'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            [Platzhalter] Wir verarbeiten Ihre Stammdaten (Name, Geburtsdatum, Adresse, Kontaktdaten),
            Angaben zu Ihrem Haushalt sowie Einkommensnachweise, um Ihre Anspruchsberechtigung auf
            Lebensmittelausgaben zu prüfen und die Ausgaben zu organisieren.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Rechtsgrundlage'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            [Platzhalter] Die Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a
            DSGVO). Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen; dies
            berührt nicht die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Speicherdauer'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" space-after="4mm" line-height="1.5">
            [Platzhalter] Ihre Daten werden für die Dauer Ihrer Anspruchsberechtigung sowie darüber
            hinaus für einen begrenzten Zeitraum gespeichert und danach gelöscht.
        </fo:block>
        <xsl:call-template name="section-title">
            <xsl:with-param name="text" select="'Ihre Rechte und Kontakt'"/>
        </xsl:call-template>
        <fo:block font-size="10pt" color="{$tafelInk}" line-height="1.5">
            [Platzhalter] Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
            Verarbeitung Ihrer Daten sowie das Recht, sich bei der Datenschutzbehörde zu beschweren.
            Kontakt: [Platzhalter - Name, Adresse, E-Mail der Organisation].
        </fo:block>
    </xsl:template>

    <xsl:template name="privacy-notice-consent-statement">
        <fo:block background-color="{$tafelAccentTint}" padding="3mm" space-before="4mm" space-after="6mm">
            <fo:block font-size="10pt" font-weight="bold" color="{$tafelInk}">
                Ich habe die Datenschutzerklärung gelesen und verstanden und willige der Verarbeitung
                meiner personenbezogenen Daten für die oben genannten Zwecke ein.
            </fo:block>
        </fo:block>
    </xsl:template>

    <xsl:template name="privacy-notice-signature">
        <fo:table table-layout="fixed" width="100%" space-before="10mm">
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
