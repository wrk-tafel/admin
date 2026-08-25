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
                    <fo:block font-size="10pt" color="{$tafelMuted}" text-align="right" padding-top="0.25cm">
                        Seite <fo:page-number/> von <fo:page-number-citation-last ref-id="main"/>
                    </fo:block>
                </fo:static-content>
                <fo:flow flow-name="xsl-region-body">
                    <fo:block font-family="Helvetica" id="main">
                        <xsl:call-template name="document-header">
                            <xsl:with-param name="title" select="'Datenexport'"/>
                            <xsl:with-param name="subtitle" select="concat('erstellt am ', exportedAt)"/>
                            <xsl:with-param name="logoContentType" select="logoContentType"/>
                            <xsl:with-param name="logoBytes" select="logoBytes"/>
                        </xsl:call-template>

                        <xsl:call-template name="section-title">
                            <xsl:with-param name="text" select="'Stammdaten'"/>
                        </xsl:call-template>
                        <fo:block space-after="6mm">
                            <xsl:for-each select="masterData/masterData">
                                <xsl:call-template name="stat-row">
                                    <xsl:with-param name="label" select="label"/>
                                    <xsl:with-param name="value" select="value"/>
                                </xsl:call-template>
                            </xsl:for-each>
                        </fo:block>

                        <xsl:call-template name="section-title">
                            <xsl:with-param name="text" select="'Berechtigungen'"/>
                        </xsl:call-template>
                        <fo:block>
                            <xsl:call-template name="permissions-table"/>
                        </fo:block>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>

    <!-- A single bold, white-on-accent header cell - the repeating building block of the table below. -->
    <xsl:template name="table-header-cell">
        <xsl:param name="text"/>
        <fo:table-cell font-weight="bold" color="white" padding="1.5mm">
            <fo:block font-size="8pt"><xsl:value-of select="$text"/></fo:block>
        </fo:table-cell>
    </xsl:template>

    <xsl:template name="permissions-table">
        <xsl:choose>
            <xsl:when test="permissions/permissions">
                <fo:table table-layout="fixed" width="100%" border="0.25mm solid {$tafelHairline}">
                    <fo:table-column column-width="40%"/>
                    <fo:table-column column-width="60%"/>
                    <fo:table-header background-color="{$tafelAccent}">
                        <fo:table-row>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Kategorie'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Berechtigung'"/></xsl:call-template>
                        </fo:table-row>
                    </fo:table-header>
                    <fo:table-body>
                        <xsl:for-each select="permissions/permissions">
                            <fo:table-row border-bottom="0.25mm solid {$tafelHairline}">
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="category"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="title"/></fo:block></fo:table-cell>
                            </fo:table-row>
                        </xsl:for-each>
                    </fo:table-body>
                </fo:table>
            </xsl:when>
            <xsl:otherwise>
                <fo:block color="{$tafelMuted}">Keine Berechtigungen vorhanden</fo:block>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
</xsl:stylesheet>
