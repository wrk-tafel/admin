<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template name="masterdata">
        <fo:block font-family="Helvetica" start-indent="0pt" end-indent="0pt">
            <fo:block space-after="1cm">
                <xsl:call-template name="masterdata-header"/>
            </fo:block>
            <fo:block space-after="1cm">
                <xsl:call-template name="masterdata-body"/>
            </fo:block>
            <fo:block space-after="1cm">
                <xsl:call-template name="masterdata-footer"/>
            </fo:block>
        </fo:block>
    </xsl:template>
    <xsl:template name="masterdata-header">
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
    <xsl:template name="masterdata-customerData">
        <xsl:param name="data"/>
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="100%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block border-bottom="0.2mm solid #000000"
                                  font-size="12pt" font-weight="bold" text-align="center"
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
                                            <fo:block font-weight="bold">Nachname:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/lastname"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Vorname:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/firstname"/>
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
                                            <fo:block font-weight="bold">Geschlecht:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/gender"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Nationalität:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/country"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Addresse:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block linefeed-treatment="preserve">
                                                <xsl:variable name="addressDataLine1">
                                                    <xsl:value-of select="$data/address/street"/>
                                                    <xsl:if test="$data/address/houseNumber != ''">
                                                        <xsl:value-of select="' '"/>
                                                        <xsl:value-of select="$data/address/houseNumber"/>
                                                    </xsl:if>
                                                </xsl:variable>
                                                <xsl:variable name="addressDataLine2">
                                                    <xsl:if test="$data/address/stairway != ''">
                                                        <xsl:value-of select="'Stiege '"/>
                                                        <xsl:value-of select="$data/address/stairway"/>
                                                    </xsl:if>
                                                    <xsl:if test="$data/address/door != ''">
                                                        <xsl:if test="$data/address/stairway != ''">
                                                            <xsl:value-of select="' '"/>
                                                        </xsl:if>
                                                        <xsl:value-of select="'Top '"/>
                                                        <xsl:value-of select="$data/address/door"/>
                                                    </xsl:if>
                                                </xsl:variable>
                                                <xsl:variable name="addressDataLine3">
                                                    <xsl:if test="$data/address/postalCode != ''">
                                                        <xsl:value-of select="$data/address/postalCode"/>
                                                    </xsl:if>
                                                    <xsl:if test="$data/address/postalCode != ''">
                                                        <xsl:value-of select="' '"/>
                                                    </xsl:if>
                                                    <xsl:value-of select="$data/address/city"/>
                                                </xsl:variable>
                                                <xsl:value-of select="$addressDataLine1"/>
                                                <xsl:value-of select="'&#xA;'"/>
                                                <xsl:value-of select="$addressDataLine2"/>
                                                <xsl:value-of select="'&#xA;'"/>
                                                <xsl:value-of select="$addressDataLine3"/>
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
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">Einkommen:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/income"/>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                    <fo:table-row>
                                        <fo:table-cell>
                                            <fo:block font-weight="bold">--> bis:</fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell>
                                            <fo:block>
                                                <xsl:value-of select="$data/incomeDueDate"/>
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
    <xsl:template name="masterdata-additionalPersons">
        <xsl:param name="data"/>
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="100%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block border-bottom="0.2mm solid #000000" font-size="12pt" font-weight="bold"
                                  text-align="center"
                                  margin-top="1mm" margin-bottom="1mm">
                            weitere Personen
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block border-left="0.1mm solid #000000"
                                  margin-top="1mm" margin-bottom="1mm"
                                  margin-right="1mm">
                            <xsl:choose>
                                <xsl:when test="$data/additionalPersons != ''">
                                    <fo:table table-layout="fixed" width="100%"
                                              border-collapse="separate"
                                              border-spacing="0pt 4pt"
                                              margin-left="2mm">
                                        <fo:table-column column-width="100%"/>
                                        <fo:table-body end-indent="-0.1in">
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
                                                        <fo:table table-layout="fixed" width="100%">
                                                            <fo:table-column column-width="50%"/>
                                                            <fo:table-column column-width="50%"/>
                                                            <fo:table-body>
                                                                <fo:table-row>
                                                                    <fo:table-cell>
                                                                        <fo:block>
                                                                            <xsl:value-of select="./birthDate"/>
                                                                        </fo:block>
                                                                    </fo:table-cell>
                                                                    <fo:table-cell>
                                                                        <fo:block>
                                                                            <xsl:value-of select="./gender"/>
                                                                        </fo:block>
                                                                    </fo:table-cell>
                                                                </fo:table-row>
                                                                <fo:table-row>
                                                                    <fo:table-cell>
                                                                        <fo:block>Nationalität:</fo:block>
                                                                    </fo:table-cell>
                                                                    <fo:table-cell>
                                                                        <fo:block>
                                                                            <xsl:value-of select="./country"/>
                                                                        </fo:block>
                                                                    </fo:table-cell>
                                                                </fo:table-row>
                                                                <fo:table-row>
                                                                    <fo:table-cell>
                                                                        <fo:block>Arbeitgeber:</fo:block>
                                                                    </fo:table-cell>
                                                                    <fo:table-cell>
                                                                        <fo:block>
                                                                            <xsl:value-of select="./employer"/>
                                                                        </fo:block>
                                                                    </fo:table-cell>
                                                                </fo:table-row>
                                                                <fo:table-row>
                                                                    <fo:table-cell>
                                                                        <fo:block>Einkommen:</fo:block>
                                                                    </fo:table-cell>
                                                                    <fo:table-cell>
                                                                        <fo:block>
                                                                            <xsl:value-of select="./income"/>
                                                                        </fo:block>
                                                                    </fo:table-cell>
                                                                </fo:table-row>
                                                                <fo:table-row>
                                                                    <fo:table-cell>
                                                                        <fo:block>--> bis:</fo:block>
                                                                    </fo:table-cell>
                                                                    <fo:table-cell>
                                                                        <fo:block>
                                                                            <xsl:value-of select="./incomeDueDate"/>
                                                                        </fo:block>
                                                                    </fo:table-cell>
                                                                </fo:table-row>
                                                            </fo:table-body>
                                                        </fo:table>
                                                    </fo:table-cell>
                                                </fo:table-row>
                                            </xsl:for-each>
                                        </fo:table-body>
                                    </fo:table>
                                </xsl:when>
                                <xsl:otherwise>
                                    <fo:block margin-left="2mm">Keine weiteren Personen</fo:block>
                                </xsl:otherwise>
                            </xsl:choose>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="masterdata-body">
        <fo:block>
            <fo:table table-layout="fixed" width="100%">
                <fo:table-column column-width="60%"/>
                <fo:table-column column-width="40%"/>
                <fo:table-body>
                    <fo:table-row>
                        <fo:table-cell>
                            <xsl:call-template name="masterdata-customerData">
                                <xsl:with-param name="data" select="./customer"/>
                            </xsl:call-template>
                        </fo:table-cell>
                        <fo:table-cell>
                            <xsl:call-template name="masterdata-additionalPersons">
                                <xsl:with-param name="data"
                                                select="./customer/additionalPersons"/>
                            </xsl:call-template>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
    <xsl:template name="masterdata-footer">
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
                                <fo:inline font-weight="bold">--> davon Kinder bis 3 Jahre:</fo:inline>
                                <fo:inline>
                                    <xsl:value-of select="concat(' ', ./countInfants)"/>
                                </fo:inline>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-body>
            </fo:table>
        </fo:block>
        <fo:block margin-top="0.2cm">
            <fo:table table-layout="fixed" width="100%">
                <fo:table-column column-width="50%"/>
                <fo:table-column column-width="50%"/>
                <fo:table-body>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block font-weight="bold">Datum, ausgestellt von:</fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block font-weight="bold">Gültig bis:</fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                    <fo:table-row>
                        <fo:table-cell>
                            <fo:block>
                                <xsl:value-of select="concat(' ', ./issuedAtDate, ', ', ./issuer)"/>
                            </fo:block>
                        </fo:table-cell>
                        <fo:table-cell>
                            <fo:block>
                                <xsl:value-of select="concat(' ', ./customer/validUntilDate)"/>
                            </fo:block>
                        </fo:table-cell>
                    </fo:table-row>
                </fo:table-body>
            </fo:table>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>