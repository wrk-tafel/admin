<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
        <fo:layout-master-set>
            <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm"
                                   margin-top="1cm" margin-bottom="1cm" margin-left="1cm" margin-right="1cm">
                <fo:region-body/>
            </fo:simple-page-master>
        </fo:layout-master-set>
        <fo:page-sequence master-reference="simpleA4">
            <fo:flow flow-name="xsl-region-body">
                <fo:block font-family="Helvetica" id="main">
                    <xsl:value-of select="title"/>
                </fo:block>
            </fo:flow>
        </fo:page-sequence>
    </fo:root>
</xsl:stylesheet>
