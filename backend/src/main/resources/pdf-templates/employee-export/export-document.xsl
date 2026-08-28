<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/common/includes/branding.xsl"/>

    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm"
                                       margin-top="1cm" margin-bottom="1cm" margin-left="1cm" margin-right="1cm">
                    <!--
                        margin-bottom reserves the region-after's own 1cm so the flowed body never
                        renders into the same space as the footer - fo:region-body does not do this
                        on its own (XSL-FO 1.1 §6.4.13 leaves region-body's margins at 0 by default).
                    -->
                    <fo:region-body margin-bottom="1cm"/>
                    <fo:region-after extent="1cm"/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="simpleA4">
                <fo:static-content flow-name="xsl-region-after">
                    <xsl:call-template name="page-footer"/>
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
                        <fo:block>
                            <xsl:for-each select="masterData/masterData">
                                <xsl:call-template name="stat-row">
                                    <xsl:with-param name="label" select="label"/>
                                    <xsl:with-param name="value" select="value"/>
                                </xsl:call-template>
                            </xsl:for-each>
                        </fo:block>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
</xsl:stylesheet>
