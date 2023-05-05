<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm"
                                       margin-top="1cm" margin-bottom="1cm" margin-left="1cm" margin-right="1cm">
                    <fo:region-body/>
                    <fo:region-after/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="simpleA4">
                <fo:static-content flow-name="xsl-region-after">
                    <fo:block font-size="10pt" text-align="right" padding-top="0.25cm" padding-bottom="0.25cm">
                        Seite <fo:page-number/> von <fo:page-number-citation-last ref-id="main"/>
                    </fo:block>
                </fo:static-content>
                <fo:flow flow-name="xsl-region-body">
                    <fo:block font-family="Helvetica" id="main">
                        <fo:block font-size="20pt" font-weight="bold" space-after="0.5cm">
                            <xsl:value-of select="title"/>
                        </fo:block>
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
            <fo:table table-layout="fixed" width="100%" border-width="1pt" border-style="solid">
                <fo:table-column column-width="10%"/>
                <fo:table-column column-width="40%"/>
                <fo:table-column column-width="25%"/>
                <fo:table-column column-width="25%"/>
                <fo:table-header background-color="#D3D3D3">
                    <fo:table-row>
                        <fo:table-cell font-weight="bold" text-align="center" border-right="solid 1pt #000000" padding="5pt">
                            <fo:block>Ticket</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" text-align="center" border-right="solid 1pt #000000" padding="5pt">
                            <fo:block>Name (Hauptbezieher)</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" text-align="center" border-right="solid 1pt #000000" padding="5pt">
                            <fo:block>Personen insgesamt</fo:block>
                        </fo:table-cell>
                        <fo:table-cell font-weight="bold" text-align="center" padding="5pt">
                            <fo:block>davon unter 3 Jahren</fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-header>
                <fo:table-body>
                    <xsl:for-each select="customers/customers">
                        <fo:table-row border-width="1pt" border-style="solid">
                            <fo:table-cell text-align="center" display-align="center" border-right="solid 1pt #000000" padding="5pt">
                                <fo:block>
                                    <xsl:value-of select="ticketNumber"/>
                                </fo:block>
                            </fo:table-cell>
                            <fo:table-cell text-align="center" display-align="center" border-right="solid 1pt #000000" padding="5pt">
                                <fo:block>
                                    <xsl:value-of select="name"/>
                                </fo:block>
                            </fo:table-cell>
                            <fo:table-cell text-align="center" display-align="center" border-right="solid 1pt #000000" padding="5pt">
                                <fo:block>
                                    <xsl:value-of select="countPersons"/>
                                </fo:block>
                            </fo:table-cell>
                            <fo:table-cell text-align="center" display-align="center" padding="5pt">
                                <fo:block>
                                    <xsl:value-of select="countInfants"/>
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                    </xsl:for-each>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>
