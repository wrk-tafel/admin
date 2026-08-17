<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm"
                                       margin-top="1cm" margin-bottom="1cm" margin-left="1cm" margin-right="1cm">
                    <fo:region-body/>
                    <fo:region-after extent="1cm"/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="simpleA4">
                <fo:static-content flow-name="xsl-region-after">
                    <fo:block font-size="10pt" color="{$tafelMuted}" text-align="right" padding-top="0.25cm" padding-bottom="0.25cm">
                        Seite <fo:page-number/> von <fo:page-number-citation-last ref-id="main"/>
                    </fo:block>
                </fo:static-content>
                <fo:flow flow-name="xsl-region-body">
                    <fo:block font-family="Helvetica" id="main">
                        <xsl:call-template name="document-header">
                            <xsl:with-param name="title" select="title"/>
                            <xsl:with-param name="logoContentType" select="logoContentType"/>
                            <xsl:with-param name="logoBytes" select="logoBytes"/>
                            <xsl:with-param name="logoWidth" select="'3.2cm'"/>
                        </xsl:call-template>
                        <xsl:if test="halftimeTicketNumber">
                            <fo:block background-color="{$tafelAccentTint}" padding="3mm" space-after="5mm">
                                <fo:block font-weight="bold" color="{$tafelInk}" space-after="2mm">
                                    Halbzeit – nach Ticketnummer: <xsl:value-of select="halftimeTicketNumber"/>
                                </fo:block>
                                <fo:table table-layout="fixed" width="100%">
                                    <fo:table-column column-width="50%"/>
                                    <fo:table-column column-width="50%"/>
                                    <fo:table-body>
                                        <fo:table-row>
                                            <fo:table-cell>
                                                <fo:block>Anzahl Haushalte: <xsl:value-of select="countHouseholdsOverall"/></fo:block>
                                            </fo:table-cell>
                                            <fo:table-cell>
                                                <fo:block>Anzahl Personen: <xsl:value-of select="countPersonsOverall"/></fo:block>
                                            </fo:table-cell>
                                        </fo:table-row>
                                    </fo:table-body>
                                </fo:table>
                            </fo:block>
                        </xsl:if>
                        <fo:block>
                            <xsl:call-template name="customerlist"/>
                        </fo:block>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
    <xsl:template name="customerlist">
        <fo:block start-indent="0pt" end-indent="0pt">
            <fo:table table-layout="fixed" width="100%" border="0.25mm solid {$tafelHairline}">
                <fo:table-column column-width="30%"/>
                <fo:table-column column-width="30%"/>
                <fo:table-column column-width="20%"/>
                <fo:table-column column-width="20%"/>
                <fo:table-header background-color="{$tafelAccent}">
                    <fo:table-row>
                        <fo:table-cell font-weight="bold" color="white" text-align="center" padding="2mm">
                            <fo:block>Ticket</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" color="white" text-align="center" padding="2mm">
                            <fo:block>Kundennummer</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" color="white" text-align="center" padding="2mm">
                            <fo:block>Personen im Haushalt</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" color="white" text-align="center" padding="2mm">
                            <fo:block>davon unter 3 Jahren</fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-header>
                <fo:table-body>
                    <xsl:choose>
                        <xsl:when test="households/households">
                            <xsl:for-each select="households/households">
                                <fo:table-row border-bottom="0.25mm solid {$tafelHairline}">
                                    <fo:table-cell text-align="center" display-align="center" padding="2mm">
                                        <fo:block>
                                            <xsl:value-of select="ticketNumber"/>
                                        </fo:block>
                                    </fo:table-cell>
                                    <fo:table-cell text-align="center" display-align="center" padding="2mm">
                                        <fo:block>
                                            <xsl:value-of select="householdId"/>
                                        </fo:block>
                                    </fo:table-cell>
                                    <fo:table-cell text-align="center" display-align="center" padding="2mm">
                                        <fo:block>
                                            <xsl:value-of select="countPersons"/>
                                        </fo:block>
                                    </fo:table-cell>
                                    <fo:table-cell text-align="center" display-align="center" padding="2mm">
                                        <fo:block>
                                            <xsl:value-of select="countInfants"/>
                                        </fo:block>
                                    </fo:table-cell>
                                </fo:table-row>
                                <xsl:if test="ticketNumber = ../../halftimeTicketNumber">
                                    <fo:table-row background-color="{$tafelAccentTint}">
                                        <fo:table-cell number-columns-spanned="4" font-weight="bold" color="{$tafelInk}"
                                                       display-align="center" text-align="center" padding="2mm" font-size="14pt">
                                            <fo:block>HALBZEIT</fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                </xsl:if>
                            </xsl:for-each>
                        </xsl:when>
                    <xsl:otherwise>
                        <fo:table-row>
                            <fo:table-cell number-columns-spanned="4" text-align="center" font-weight="bold" display-align="center" padding="2mm">
                                <fo:block>Keine Kunden angemeldet</fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                    </xsl:otherwise>
                    </xsl:choose>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>
