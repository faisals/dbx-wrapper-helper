--------------------------------------------------------
-- DB_Change_ID:    {{SCRIPT_ID}}
-- DB_ASSET:        {{DB_ASSET}}
-- DB_RPE_VER:      {{RP_VERSION}}
-- Author:          {{AUTHOR}} 
------------------------------------------------------------
DECLARE @ErrorCount INT;
DECLARE @ShouldApply VARCHAR(5);
DECLARE @ScriptID VARCHAR(30);
DECLARE @NA VARCHAR(16)
DECLARE @RPVer VARCHAR(16);
DECLARE @Asset VARCHAR(30);
SET @NA = 'NA'


SET @ScriptID = '{{SCRIPT_ID}}';
SET @Asset = '{{DB_ASSET}}';
SET @RPVer = '{{RP_VERSION}}';



EXEC Usp_geterrorcount @ScriptID, @ErrorCount OUTPUT

IF (@ErrorCount = 0)
BEGIN
    EXEC usp_ShouldApplyScript @ScriptID, @ShouldApply OUTPUT
    IF (@ShouldApply='TRUE')
			BEGIN TRY
				BEGIN

------------------------------------------------------------
{{SQL_CONTENT}}
----------------------------------------------------------

        EXEC usp_HandleScriptApplied @ScriptID, @Asset, @NA, @NA, @NA, @RPVer, @NA, @NA;
    END
END TRY
BEGIN CATCH
EXEC usp_HandleErrorApplyingScript @ScriptID,@Asset,@NA,@NA,@NA,@RPVer,@NA,@NA;
END CATCH;
ELSE
BEGIN
        PRINT 'Skipping previously applied script: '+@ScriptID+'. Please refer DB_CHANGE_ID in DATABASE_UPDATES table.';
    END
END
ELSE
PRINT 'Skipping script: '+@ScriptID+'. Previous error detected.'

GO