<?xml version="1.0" encoding="UTF-8"?>
<!--
    The Bezugskarte for a screen: one card-sized page, rendered as a PDF or as an image
    (PDFService.generatePng) and handed to the customer by mail or as a download. Unlike the printed
    card (idcard-document.xsl) there is nothing to cut or fold, the QR code is large enough to be
    scanned straight off a phone, and it carries no address or birth date - what leaves the
    organisation by mail is only what the check-in needs.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="card" page-height="16cm" page-width="9cm">
                    <fo:region-body margin="6mm"/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="card">
                <fo:flow flow-name="xsl-region-body" font-family="Helvetica" font-size="9pt">
                    <fo:block text-align="center">
                        <fo:external-graphic content-width="4.2cm">
                            <xsl:attribute name="src">
                                <xsl:text>url('data:</xsl:text>
                                <xsl:value-of select="logoContentType"/>
                                <xsl:text>;base64,</xsl:text>
                                <xsl:value-of select="logoBytes"/>
                                <xsl:text>')</xsl:text>
                            </xsl:attribute>
                        </fo:external-graphic>
                    </fo:block>
                    <fo:block border-bottom="0.8mm solid {$tafelAccent}" space-before="2mm" space-after="3mm"/>
                    <fo:block font-size="13pt" font-weight="bold" color="{$tafelInk}" text-align="center">
                        Bezugskarte
                    </fo:block>
                    <fo:block text-align="center" space-before="2mm">
                        <fo:external-graphic content-width="5cm">
                            <xsl:attribute name="src">
                                <xsl:text>url('data:</xsl:text>
                                <xsl:value-of select="customer/idCard/qrCodeContentType"/>
                                <xsl:text>;base64,</xsl:text>
                                <xsl:value-of select="customer/idCard/qrCodeBytes"/>
                                <xsl:text>')</xsl:text>
                            </xsl:attribute>
                        </fo:external-graphic>
                    </fo:block>
                    <fo:block text-align="center" space-before="2mm">
                        <fo:inline padding="1mm 4mm" border="0.3mm solid {$tafelAccent}"
                                   background-color="{$tafelAccentTint}" font-weight="bold"
                                   color="{$tafelInk}" font-size="13pt">
                            <xsl:value-of select="customer/id"/>
                        </fo:inline>
                    </fo:block>
                    <fo:block font-size="12pt" font-weight="bold" color="{$tafelInk}" text-align="center"
                              space-before="4mm" space-after="3mm">
                        <xsl:value-of select="concat(customer/firstname, ' ', customer/lastname)"/>
                    </fo:block>
                    <xsl:call-template name="stat-row">
                        <xsl:with-param name="label" select="'Personen im Haushalt'"/>
                        <xsl:with-param name="value" select="countPersons"/>
                    </xsl:call-template>
                    <xsl:call-template name="stat-row">
                        <xsl:with-param name="label" select="'davon unter 3 Jahren'"/>
                        <xsl:with-param name="value" select="countInfants"/>
                    </xsl:call-template>
                    <!-- The indents keep the padding inside the page margin - FOP grows a padded block outwards. -->
                    <fo:block background-color="{$tafelAccentTint}" padding="2.5mm" space-before="3mm"
                              start-indent="2.5mm" end-indent="2.5mm"
                              font-size="7.5pt" font-weight="bold" color="{$tafelInk}">
                        Diese Bezugskarte ist Eigentum des Roten Kreuzes und ist auf Verlangen wieder
                        zurückzugeben.
                    </fo:block>
                    <fo:block font-size="7.5pt" color="{$tafelMuted}" space-before="2mm" text-align="center">
                        Wiener Rotes Kreuz – Team Österreich Tafel
                    </fo:block>
                    <fo:block font-size="7.5pt" color="{$tafelMuted}" text-align="center">
                        Safargasse 4, 1030 Wien
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
</xsl:stylesheet>
