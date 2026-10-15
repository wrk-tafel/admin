<?xml version="1.0" encoding="UTF-8"?>
<!--
    The "Notfallliste": every household entitled today, for the case that the application cannot be
    reached during a distribution. The footer repeats on every page how the paper is to be handled,
    since a printed page can end up anywhere a screen cannot.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm"
                                       margin-top="1cm" margin-bottom="1cm" margin-left="1cm" margin-right="1cm">
                    <!-- margin-bottom reserves the region-after's own extent, see customerlist.xsl -->
                    <fo:region-body margin-bottom="2cm"/>
                    <fo:region-after extent="2cm"/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="simpleA4">
                <fo:static-content flow-name="xsl-region-after">
                    <fo:block font-family="Helvetica">
                        <fo:block font-size="9pt" font-weight="bold" color="{$tafelAccent}" padding-top="0.2cm">
                            Vertraulich: Diese Liste enthält personenbezogene Daten. Bis zur Verwendung
                            versperrt aufbewahren, nicht mit nach Hause nehmen und nach dem Ausgabetag vernichten.
                        </fo:block>
                        <xsl:call-template name="page-footer">
                            <xsl:with-param name="generatedAt" select="generatedAt"/>
                        </xsl:call-template>
                    </fo:block>
                </fo:static-content>
                <fo:flow flow-name="xsl-region-body">
                    <fo:block font-family="Helvetica" id="main">
                        <xsl:call-template name="document-header">
                            <xsl:with-param name="title" select="title"/>
                            <xsl:with-param name="subtitle" select="subtitle"/>
                            <xsl:with-param name="logoContentType" select="logoContentType"/>
                            <xsl:with-param name="logoBytes" select="logoBytes"/>
                            <xsl:with-param name="logoWidth" select="'3.2cm'"/>
                        </xsl:call-template>
                        <fo:block background-color="{$tafelAccentTint}" padding="3mm" space-after="5mm">
                            <fo:table table-layout="fixed" width="100%">
                                <fo:table-column column-width="50%"/>
                                <fo:table-column column-width="50%"/>
                                <fo:table-body>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block>Anzahl Haushalte: <xsl:value-of select="countHouseholds"/></fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>Anzahl Personen: <xsl:value-of select="countPersons"/></fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                </fo:table-body>
                            </fo:table>
                        </fo:block>
                        <xsl:call-template name="emergency-list"/>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
    <xsl:template name="emergency-list">
        <fo:block start-indent="0pt" end-indent="0pt">
            <fo:table table-layout="fixed" width="100%" border="0.25mm solid {$tafelHairline}" font-size="10pt">
                <fo:table-column column-width="13%"/>
                <fo:table-column column-width="36%"/>
                <fo:table-column column-width="11%"/>
                <fo:table-column column-width="14%"/>
                <fo:table-column column-width="26%"/>
                <fo:table-header background-color="{$tafelAccent}">
                    <fo:table-row>
                        <fo:table-cell font-weight="bold" color="white" text-align="center" padding="2mm">
                            <fo:block>Kundennr.</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" color="white" padding="2mm">
                            <fo:block>Name</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" color="white" text-align="center" padding="2mm">
                            <fo:block>Personen</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" color="white" text-align="center" padding="2mm">
                            <fo:block>Gültig bis</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" color="white" text-align="center" padding="2mm">
                            <fo:block>Sperre</fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-header>
                <fo:table-body>
                    <xsl:choose>
                        <xsl:when test="households/households">
                            <xsl:for-each select="households/households">
                                <fo:table-row border-bottom="0.25mm solid {$tafelHairline}" keep-together.within-page="always">
                                    <xsl:if test="normalize-space(lockText) != ''">
                                        <xsl:attribute name="background-color"><xsl:value-of select="$tafelAccentTint"/></xsl:attribute>
                                    </xsl:if>
                                    <fo:table-cell text-align="center" display-align="center" padding="1.5mm">
                                        <fo:block><xsl:value-of select="householdId"/></fo:block>
                                    </fo:table-cell>
                                    <fo:table-cell display-align="center" padding="1.5mm">
                                        <fo:block><xsl:value-of select="name"/></fo:block>
                                    </fo:table-cell>
                                    <fo:table-cell text-align="center" display-align="center" padding="1.5mm">
                                        <fo:block><xsl:value-of select="countPersons"/></fo:block>
                                    </fo:table-cell>
                                    <fo:table-cell text-align="center" display-align="center" padding="1.5mm">
                                        <fo:block><xsl:value-of select="validUntil"/></fo:block>
                                    </fo:table-cell>
                                    <fo:table-cell text-align="center" display-align="center" padding="1.5mm">
                                        <fo:block font-weight="bold" color="{$tafelAccent}">
                                            <xsl:choose>
                                                <xsl:when test="normalize-space(lockText) != ''"><xsl:value-of select="lockText"/></xsl:when>
                                                <xsl:otherwise><xsl:text>&#160;</xsl:text></xsl:otherwise>
                                            </xsl:choose>
                                        </fo:block>
                                    </fo:table-cell>
                                </fo:table-row>
                            </xsl:for-each>
                        </xsl:when>
                        <xsl:otherwise>
                            <fo:table-row>
                                <fo:table-cell number-columns-spanned="5" text-align="center" font-weight="bold" display-align="center" padding="2mm">
                                    <fo:block>Keine bezugsberechtigten Kunden</fo:block>
                                </fo:table-cell>
                            </fo:table-row>
                        </xsl:otherwise>
                    </xsl:choose>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>
