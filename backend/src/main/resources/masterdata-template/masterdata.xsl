<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:fo="http://www.w3.org/1999/XSL/Format" exclude-result-prefixes="fo">
    <xsl:template match="data">
        <fo:root xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <fo:layout-master-set>
                <fo:simple-page-master master-name="simpleA4" page-height="29.7cm" page-width="21cm"
                                       margin-top="1cm" margin-bottom="1cm" margin-left="1cm" margin-right="1cm">
                    <fo:region-body/>
                </fo:simple-page-master>
            </fo:layout-master-set>
            <fo:page-sequence master-reference="simpleA4">
                <fo:flow flow-name="xsl-region-body">
                    <fo:block font-family="Helvetica">
                        <fo:block space-after="1cm">
                            <xsl:call-template name="header"/>
                        </fo:block>
                        <fo:block>
                            <fo:table table-layout="fixed" width="100%">
                                <fo:table-column column-width="60%"/>
                                <fo:table-column column-width="40%"/>
                                <fo:table-body>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <xsl:call-template name="customerData">
                                                <xsl:with-param name="data" select="./customer"/>
                                            </xsl:call-template>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <xsl:call-template name="additionalPersons">
                                                <xsl:with-param name="data"
                                                                select="./customer/additionalPersons"/>
                                            </xsl:call-template>
                                        </fo:table-cell>
                                    </fo:table-row>
                                </fo:table-body>
                            </fo:table>
                        </fo:block>
                        <fo:block margin-top="1cm">
                            <fo:table table-layout="fixed" width="100%">
                                <fo:table-column column-width="100%"/>
                                <fo:table-body>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block>
                                                <fo:inline font-weight="bold">Anzahl der Personen im gemeinsamen
                                                    Haushalt:
                                                </fo:inline>
                                                <fo:inline>
                                                    <xsl:value-of select="concat(' ', ./countPersons)"/>
                                                </fo:inline>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block>
                                                <fo:inline font-weight="bold">Davon Kinder bis 3 Jahre:
                                                </fo:inline>
                                                <fo:inline>
                                                    <xsl:value-of select="concat(' ', ./countInfants)"/>
                                                </fo:inline>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                </fo:table-body>
                            </fo:table>
                        </fo:block>
                        <fo:block margin-top="3cm">
                            <fo:table table-layout="fixed" width="100%">
                                <fo:table-column column-width="30%"/>
                                <fo:table-column column-width="70%"/>
                                <fo:table-body>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block>
                                                <fo:inline font-weight="bold">Datum:</fo:inline>
                                                <fo:inline>
                                                    <xsl:value-of select="concat(' ', ./currentDate)"/>
                                                </fo:inline>
                                            </fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block border-bottom="0.25mm solid #000000">
                                                <fo:inline font-weight="bold">Unterschrift:</fo:inline>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                </fo:table-body>
                            </fo:table>
                        </fo:block>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>
    <xsl:template name="header">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="75%"/>
            <fo:table-column column-width="25%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block font-size="20pt" font-weight="bold" margin-top="2cm">Stammdatenblatt</fo:block>
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block>
                            <fo:external-graphic content-width="4.7cm">
                                <xsl:attribute name="src">
                                    <xsl:text>url('data:</xsl:text>
                                    <xsl:value-of select="logoContentType"/>
                                    <xsl:text>;base64,</xsl:text>
                                    <xsl:value-of select="logoBytes"/>
                                    <xsl:text>')</xsl:text>
                                </xsl:attribute>
                            </fo:external-graphic>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="customerData">
        <xsl:param name="data"/>
        <fo:table border="0.1mm solid #000000" table-layout="fixed" width="100%">
            <fo:table-column column-width="100%"/>
            <fo:table-body>
                <fo:table-row border-bottom="0.1mm solid #000000">
                    <fo:table-cell>
                        <fo:block font-size="12pt" font-weight="bold" text-align="center"
                                  margin-top="1mm" margin-bottom="1mm">
                            Hauptbezieher
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-top="1mm" margin-bottom="1mm" margin-left="1mm"
                                  margin-right="1mm">
                            <fo:table table-layout="fixed" width="100%">
                                <fo:table-column column-width="35%"/>
                                <fo:table-column column-width="65%"/>
                                <fo:table-body>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Kundennummer:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/id"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Name:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="concat($data/lastname, ' ', $data/firstname)"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Geburtsdatum:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/birthDate"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Addresse:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block linefeed-treatment="preserve">
                                                <xsl:variable name="addressData">
                                                    <xsl:value-of select="$data/address/street"/>
                                                    <xsl:value-of select="' '"/>
                                                    <xsl:value-of select="$data/address/houseNumber"/>
                                                    <xsl:value-of select="'&#xA;'"/>
                                                    <xsl:if test="$data/address/stairway != ''">
                                                        <xsl:value-of select="' Stiege '"/>
                                                        <xsl:value-of select="$data/address/stairway"/>
                                                    </xsl:if>
                                                    <xsl:value-of select="' Top '"/>
                                                    <xsl:value-of select="$data/address/door"/>
                                                    <xsl:value-of select="'&#xA;'"/>
                                                    <xsl:value-of select="$data/address/postalCode"/>
                                                    <xsl:value-of select="' '"/>
                                                    <xsl:value-of select="$data/address/city"/>
                                                </xsl:variable>
                                                <xsl:value-of select="$addressData"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Telefonnummer:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/telephoneNumber"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">E-Mail:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/email"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Arbeitgeber:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/employer"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                </fo:table-body>
                            </fo:table>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="additionalPersons">
        <xsl:param name="data"/>
        <fo:table border="0.1mm solid #000000" table-layout="fixed" width="100%">
            <fo:table-column column-width="100%"/>
            <fo:table-body>
                <fo:table-row border-bottom="0.1mm solid #000000">
                    <fo:table-cell>
                        <fo:block font-size="12pt" font-weight="bold" text-align="center"
                                  margin-top="1mm" margin-bottom="1mm">
                            Weitere Personen
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-top="1mm" margin-bottom="1mm" margin-left="1mm"
                                  margin-right="1mm">
                            <xsl:choose>
                                <xsl:when test="$data/additionalPersons != ''">
                                    <fo:table table-layout="fixed" width="100%">
                                        <fo:table-column column-width="100%"/>
                                        <fo:table-body>
                                            <xsl:for-each select="$data/additionalPersons">
                                                <fo:table-row>
                                                    <fo:table-cell>
                                                        <fo:block font-weight="bold">
                                                            <xsl:value-of
                                                                    select="concat(./lastname, ' ', ./firstname)"/>
                                                        </fo:block>
                                                    </fo:table-cell>
                                                </fo:table-row>
                                                <fo:table-row>
                                                    <fo:table-cell>
                                                        <fo:block>
                                                            <xsl:value-of select="./birthDate"/>
                                                        </fo:block>
                                                    </fo:table-cell>
                                                </fo:table-row>
                                            </xsl:for-each>
                                        </fo:table-body>
                                    </fo:table>
                                </xsl:when>
                                <xsl:otherwise>
                                    <fo:block>Keine weiteren Personen</fo:block>
                                </xsl:otherwise>
                            </xsl:choose>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
</xsl:stylesheet>