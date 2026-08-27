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
                            <xsl:with-param name="subtitle" select="concat('Kundennummer ', householdId, ' · erstellt am ', exportedAt)"/>
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
                            <xsl:with-param name="text" select="'Personen'"/>
                        </xsl:call-template>
                        <fo:block space-after="6mm">
                            <xsl:call-template name="persons-table"/>
                        </fo:block>

                        <xsl:call-template name="section-title">
                            <xsl:with-param name="text" select="'Notizen'"/>
                        </xsl:call-template>
                        <fo:block space-after="6mm">
                            <xsl:call-template name="notes-table"/>
                        </fo:block>

                        <xsl:call-template name="section-title">
                            <xsl:with-param name="text" select="'Teilnahme-Historie'"/>
                        </xsl:call-template>
                        <fo:block space-after="6mm">
                            <xsl:call-template name="attendances-table"/>
                        </fo:block>

                        <xsl:call-template name="section-title">
                            <xsl:with-param name="text" select="'Dokumente'"/>
                        </xsl:call-template>
                        <fo:block>
                            <xsl:call-template name="documents-table"/>
                        </fo:block>
                    </fo:block>
                </fo:flow>
            </fo:page-sequence>
        </fo:root>
    </xsl:template>

    <!-- A single bold, white-on-accent header cell - the repeating building block of every table below. -->
    <xsl:template name="table-header-cell">
        <xsl:param name="text"/>
        <fo:table-cell font-weight="bold" color="white" padding="1.5mm">
            <fo:block font-size="8pt"><xsl:value-of select="$text"/></fo:block>
        </fo:table-cell>
    </xsl:template>

    <xsl:template name="persons-table">
        <xsl:choose>
            <xsl:when test="persons/persons">
                <fo:table table-layout="fixed" width="100%" border="0.25mm solid {$tafelHairline}">
                    <fo:table-column column-width="14%"/>
                    <fo:table-column column-width="8%"/>
                    <fo:table-column column-width="8%"/>
                    <fo:table-column column-width="8%"/>
                    <fo:table-column column-width="9%"/>
                    <fo:table-column column-width="12%"/>
                    <fo:table-column column-width="8%"/>
                    <fo:table-column column-width="8%"/>
                    <fo:table-column column-width="7%"/>
                    <fo:table-column column-width="7%"/>
                    <fo:table-column column-width="11%"/>
                    <fo:table-header background-color="{$tafelAccent}">
                        <fo:table-row>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Name'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Hauptbez.'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Geburtsdatum'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Geschlecht'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Land'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Arbeitgeber'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Einkommen'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Eink. gültig bis'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Familienbeihilfe'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Nicht im HH'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Geändert von'"/></xsl:call-template>
                        </fo:table-row>
                    </fo:table-header>
                    <fo:table-body>
                        <xsl:for-each select="persons/persons">
                            <fo:table-row border-bottom="0.25mm solid {$tafelHairline}">
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="name"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="mainPerson"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="birthDate"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="gender"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="country"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="employer"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="income"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="incomeDue"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="familyAllowance"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="excludeFromHousehold"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="updatedBy"/></fo:block></fo:table-cell>
                            </fo:table-row>
                        </xsl:for-each>
                    </fo:table-body>
                </fo:table>
            </xsl:when>
            <xsl:otherwise>
                <fo:block color="{$tafelMuted}">Keine Personen vorhanden</fo:block>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="notes-table">
        <xsl:choose>
            <xsl:when test="notes/notes">
                <fo:table table-layout="fixed" width="100%" border="0.25mm solid {$tafelHairline}">
                    <fo:table-column column-width="17%"/>
                    <fo:table-column column-width="17%"/>
                    <fo:table-column column-width="16%"/>
                    <fo:table-column column-width="50%"/>
                    <fo:table-header background-color="{$tafelAccent}">
                        <fo:table-row>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Zeitpunkt'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Verfasst von'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Geändert von'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Notiz'"/></xsl:call-template>
                        </fo:table-row>
                    </fo:table-header>
                    <fo:table-body>
                        <xsl:for-each select="notes/notes">
                            <fo:table-row border-bottom="0.25mm solid {$tafelHairline}">
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="timestamp"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="author"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="updatedBy"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt" linefeed-treatment="preserve"><xsl:value-of select="note"/></fo:block></fo:table-cell>
                            </fo:table-row>
                        </xsl:for-each>
                    </fo:table-body>
                </fo:table>
            </xsl:when>
            <xsl:otherwise>
                <fo:block color="{$tafelMuted}">Keine Notizen vorhanden</fo:block>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="attendances-table">
        <xsl:choose>
            <xsl:when test="attendances/attendances">
                <fo:table table-layout="fixed" width="100%" border="0.25mm solid {$tafelHairline}">
                    <fo:table-column column-width="24%"/>
                    <fo:table-column column-width="24%"/>
                    <fo:table-column column-width="17%"/>
                    <fo:table-column column-width="17%"/>
                    <fo:table-column column-width="18%"/>
                    <fo:table-header background-color="{$tafelAccent}">
                        <fo:table-row>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Ausgabe gestartet'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Ausgabe beendet'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Ticketnummer'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Bearbeitet'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Unkostenb. bezahlt'"/></xsl:call-template>
                        </fo:table-row>
                    </fo:table-header>
                    <fo:table-body>
                        <xsl:for-each select="attendances/attendances">
                            <fo:table-row border-bottom="0.25mm solid {$tafelHairline}">
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="startedAt"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="endedAt"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="ticketNumber"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="processed"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="costContributionPaid"/></fo:block></fo:table-cell>
                            </fo:table-row>
                        </xsl:for-each>
                    </fo:table-body>
                </fo:table>
            </xsl:when>
            <xsl:otherwise>
                <fo:block color="{$tafelMuted}">Keine Teilnahmen an Ausgabetagen vorhanden</fo:block>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="documents-table">
        <xsl:choose>
            <xsl:when test="documents/documents">
                <fo:table table-layout="fixed" width="100%" border="0.25mm solid {$tafelHairline}">
                    <fo:table-column column-width="30%"/>
                    <fo:table-column column-width="18%"/>
                    <fo:table-column column-width="18%"/>
                    <fo:table-column column-width="17%"/>
                    <fo:table-column column-width="17%"/>
                    <fo:table-header background-color="{$tafelAccent}">
                        <fo:table-row>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Dateiname'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Art'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Person'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Hochgeladen von'"/></xsl:call-template>
                            <xsl:call-template name="table-header-cell"><xsl:with-param name="text" select="'Hochgeladen am'"/></xsl:call-template>
                        </fo:table-row>
                    </fo:table-header>
                    <fo:table-body>
                        <xsl:for-each select="documents/documents">
                            <fo:table-row border-bottom="0.25mm solid {$tafelHairline}">
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="fileName"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="documentType"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="person"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="uploadedBy"/></fo:block></fo:table-cell>
                                <fo:table-cell padding="1.5mm"><fo:block font-size="8.5pt"><xsl:value-of select="uploadedAt"/></fo:block></fo:table-cell>
                            </fo:table-row>
                        </xsl:for-each>
                    </fo:table-body>
                </fo:table>
            </xsl:when>
            <xsl:otherwise>
                <fo:block color="{$tafelMuted}">Keine Dokumente vorhanden</fo:block>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
</xsl:stylesheet>
