<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:include href="/pdf-templates/staff-pdf/includes/privacy-notice.xsl"/>
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
                <!-- Eight sections of legal text run past one page - a page number and the generation
                     date let loose printed pages be matched back up. -->
                <fo:static-content flow-name="xsl-region-after">
                    <fo:block font-size="10pt" color="{$tafelMuted}" text-align="right" padding-top="0.25cm">
                        Erstellt am <xsl:value-of select="issuedAtDate"/> · Seite <fo:page-number/> von
                        <fo:page-number-citation-last ref-id="main"/>
                    </fo:block>
                </fo:static-content>
                <fo:flow flow-name="xsl-region-body">
                    <xsl:call-template name="staff-privacy-notice"/>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
</xsl:stylesheet>
