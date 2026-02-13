<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format"
                version="1.1" exclude-result-prefixes="fo">
    <xsl:template name="idcard-outside">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="50%"/>
            <fo:table-column column-width="50%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:table table-layout="fixed" width="100%">
                            <fo:table-column column-width="60%"/>
                            <fo:table-column column-width="40%"/>
                            <fo:table-body>
                                <fo:table-row>
                                    <fo:table-cell>
                                        <fo:block margin-left="0.5cm" margin-top="0.5cm" margin-right="0.5cm"
                                                  font-size="10pt">
                                            Personen im gemeinsamen Haushalt:
                                        </fo:block>
                                    </fo:table-cell>
                                    <fo:table-cell>
                                        <fo:block margin-left="0.25cm" margin-top="0.5cm" margin-right="0.5cm"
                                                  font-size="10pt">
                                            <xsl:value-of select="countPersons"/>
                                        </fo:block>
                                    </fo:table-cell>
                                </fo:table-row>
                                <fo:table-row>
                                    <fo:table-cell>
                                        <fo:block margin-left="0.5cm" margin-top="0.25cm" margin-right="0.5cm"
                                                  margin-bottom="0.5cm" font-size="10pt">
                                            --> davon unter 3 Jahren:
                                        </fo:block>
                                    </fo:table-cell>
                                    <fo:table-cell>
                                        <fo:block margin-left="0.25cm" margin-top="0.25cm" margin-right="0.5cm"
                                                  margin-bottom="0.5cm" font-size="10pt">
                                            <xsl:value-of select="countInfants"/>
                                        </fo:block>
                                    </fo:table-cell>
                                </fo:table-row>
                                <fo:table-row>
                                    <fo:table-cell>
                                        <fo:block border-top="0.1mm solid #000000" margin-left="0.5cm"
                                                  margin-bottom="0.5cm"/>
                                    </fo:table-cell>
                                    <fo:table-cell>
                                        <fo:block border-top="0.1mm solid #000000" margin-right="0.5cm"
                                                  margin-bottom="0.5cm"/>
                                    </fo:table-cell>
                                </fo:table-row>
                                <fo:table-row>
                                    <fo:table-cell number-columns-spanned="2">
                                        <fo:block font-size="10pt" margin-top="2.70cm" margin-left="0.5cm" margin-right="0.5cm" font-weight="bold">
                                            Diese Bezugskarte ist Eigentum des Roten Kreuzes und ist auf Verlangen wieder zurückzugeben.
                                        </fo:block>
                                    </fo:table-cell>
                                </fo:table-row>
                                <fo:table-row>
                                    <fo:table-cell number-columns-spanned="2">
                                        <fo:block font-size="10pt" margin-top="0.25cm"  margin-left="0.5cm">
                                            Wiener Rotes Kreuz - Team Österreich Tafel
                                        </fo:block>
                                        <fo:block font-size="10pt" margin-left="0.5cm">
                                            Safargasse 4, 1030 Wien
                                        </fo:block>
                                    </fo:table-cell>
                                </fo:table-row>
                            </fo:table-body>
                        </fo:table>
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block-container border-left="0.5mm solid #000000" height="8cm">
                            <xsl:call-template name="outside-front"/>
                        </fo:block-container>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="outside-front">
        <fo:table table-layout="fixed" width="100%" text-align="center">
            <fo:table-column column-width="100%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-top="0.5cm">
                            <fo:external-graphic content-width="5.0cm">
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
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-top="0.5cm">
                            <fo:external-graphic content-width="3.0cm">
                                <xsl:attribute name="src">
                                    <xsl:text>url('data:</xsl:text>
                                    <xsl:value-of select="customer/idCard/qrCodeContentType"/>
                                    <xsl:text>;base64,</xsl:text>
                                    <xsl:value-of select="customer/idCard/qrCodeBytes"/>
                                    <xsl:text>')</xsl:text>
                                </xsl:attribute>
                            </fo:external-graphic>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-top="0.1cm">
                            <xsl:value-of select="customer/id"/>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="idcard-inside">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="50%"/>
            <fo:table-column column-width="50%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block-container height="8cm">
                            <xsl:call-template name="inside-left"/>
                        </fo:block-container>
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block-container border-left="0.5mm solid #000000" height="8cm">
                            <xsl:call-template name="inside-right"/>
                        </fo:block-container>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="inside-left">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="50%"/>
            <fo:table-column column-width="50%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-left="0.5cm" margin-top="0.5cm" font-weight="bold" font-size="10pt">
                            Hauptbezieher
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-left="0.5cm" margin-top="0.25cm" margin-right="0.25cm">
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="customer/lastname"/>
                                <xsl:with-param name="label" select="'Nachname'"/>
                            </xsl:call-template>
                        </fo:block>
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block margin-left="0.25cm" margin-top="0.25cm" margin-right="0.5cm">
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="customer/firstname"/>
                                <xsl:with-param name="label" select="'Vorname'"/>
                            </xsl:call-template>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-left="0.5cm" margin-top="0.25cm" margin-right="0.25cm">
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="customer/birthDate"/>
                                <xsl:with-param name="label" select="'Geburtsdatum'"/>
                            </xsl:call-template>
                        </fo:block>
                    </fo:table-cell>
                    <fo:table-cell>
                        <fo:block/>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell number-columns-spanned="2">
                        <fo:block margin-left="0.5cm" margin-top="0.25cm" margin-right="0.5cm">
                            <xsl:variable name="addressLine">
                                <xsl:value-of select="customer/address/street"/>
                                <xsl:value-of select="' '"/>
                                <xsl:value-of select="customer/address/houseNumber"/>
                                <xsl:if test="customer/address/stairway != '' or customer/address/door != ''">
                                    <xsl:value-of select="', '"/>
                                </xsl:if>
                                <xsl:if test="customer/address/stairway != ''">
                                    <xsl:value-of select="' Stiege '"/>
                                    <xsl:value-of select="customer/address/stairway"/>
                                </xsl:if>
                                <xsl:if test="customer/address/door != ''">
                                    <xsl:value-of select="' Top '"/>
                                    <xsl:value-of select="customer/address/door"/>
                                </xsl:if>
                                <xsl:value-of select="', '"/>
                                <xsl:value-of select="customer/address/postalCode"/>
                                <xsl:value-of select="' '"/>
                                <xsl:value-of select="customer/address/city"/>
                            </xsl:variable>
                            <xsl:call-template name="field-with-label">
                                <xsl:with-param name="value" select="$addressLine"/>
                                <xsl:with-param name="label" select="'Addresse'"/>
                            </xsl:call-template>
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
                <fo:table-row>
                    <fo:table-cell number-columns-spanned="2">
                        <fo:block-container margin-top="0.75cm">
                            <fo:table table-layout="fixed" width="100%">
                                <fo:table-column column-width="35%"/>
                                <fo:table-column column-width="65%"/>
                                <fo:table-body>
                                    <fo:table-row>
                                        <fo:table-cell display-align="after">
                                            <fo:block margin-left="0.5cm" margin-right="0.1cm" margin-bottom="0.5cm">
                                                <xsl:call-template name="field-with-label">
                                                    <xsl:with-param name="value" select="issuedAtDate"/>
                                                    <xsl:with-param name="label" select="'Ausgestellt am'"/>
                                                </xsl:call-template>
                                            </fo:block>
                                        </fo:table-cell>
                                        <fo:table-cell display-align="after">
                                            <fo:block margin-left="0.5cm" margin-right="0.5cm" margin-bottom="0.5cm">
                                                <xsl:call-template name="field-with-label">
                                                    <xsl:with-param name="value" select="issuer"/>
                                                    <xsl:with-param name="label" select="'Ausgestellt von'"/>
                                                </xsl:call-template>
                                            </fo:block>
                                        </fo:table-cell>
                                    </fo:table-row>
                                </fo:table-body>
                            </fo:table>
                        </fo:block-container>
                    </fo:table-cell>
                </fo:table-row>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="inside-right">
        <fo:table table-layout="fixed" width="100%">
            <fo:table-column column-width="100%"/>
            <fo:table-body>
                <fo:table-row>
                    <fo:table-cell>
                        <fo:block margin-left="0.5cm" margin-top="0.5cm" font-weight="bold" font-size="10pt">
                            weitere Personen
                        </fo:block>
                    </fo:table-cell>
                </fo:table-row>
                <xsl:choose>
                    <xsl:when test="customer/additionalPersons != ''">
                        <xsl:for-each select="customer/additionalPersons/additionalPersons">
                            <fo:table-row>
                                <fo:table-cell>
                                    <fo:table table-layout="fixed" width="100%">
                                        <fo:table-column column-width="50%"/>
                                        <fo:table-column column-width="50%"/>
                                        <fo:table-body>
                                            <fo:table-row>
                                                <fo:table-cell>
                                                    <fo:block margin-left="0.5cm" margin-top="0.25cm"
                                                              margin-right="0.5cm">
                                                        <xsl:call-template name="field-with-label">
                                                            <xsl:with-param name="value" select="./lastname"/>
                                                            <xsl:with-param name="label" select="'Nachname'"/>
                                                        </xsl:call-template>
                                                    </fo:block>
                                                </fo:table-cell>
                                                <fo:table-cell>
                                                    <fo:block margin-top="0.25cm" margin-right="0.5cm">
                                                        <xsl:call-template name="field-with-label">
                                                            <xsl:with-param name="value" select="./firstname"/>
                                                            <xsl:with-param name="label" select="'Vorname'"/>
                                                        </xsl:call-template>
                                                    </fo:block>
                                                </fo:table-cell>
                                            </fo:table-row>
                                        </fo:table-body>
                                    </fo:table>
                                </fo:table-cell>
                            </fo:table-row>
                        </xsl:for-each>
                    </xsl:when>
                    <xsl:otherwise>
                        <fo:table-row>
                            <fo:table-cell>
                                <fo:block margin-left="0.5cm" margin-top="0.5cm" font-size="10pt">
                                    Keine
                                </fo:block>
                            </fo:table-cell>
                        </fo:table-row>
                    </xsl:otherwise>
                </xsl:choose>
            </fo:table-body>
        </fo:table>
    </xsl:template>
    <xsl:template name="field-with-label">
        <xsl:param name="value"/>
        <xsl:param name="label"/>
        <fo:block font-size="12pt">
            <xsl:value-of select="$value"/>
        </fo:block>
        <fo:block border-top="0.1mm solid #000000" font-size="8pt" margin-top="1mm">
            <fo:block margin-top="1mm" font-weight="bold">
                <xsl:value-of select="$label"/>
            </fo:block>
        </fo:block>
    </xsl:template>
</xsl:stylesheet>