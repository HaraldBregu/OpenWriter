import { useState } from "react";
import { useTranslation } from "react-i18next";
import useTranslationLoader from "../../utils/useTranslationLoader";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  Button,
  Box,
  FormControl,
  Container,
  SelectChangeEvent
} from '@mui/material';

function LanguageSelector() {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const { changeLanguage } = useTranslationLoader();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const handleSelectChange = (e: SelectChangeEvent) => {
    setSelectedLanguage(e.target.value);
  };

  const handleSave = () => {
    changeLanguage(selectedLanguage);
    i18n.changeLanguage(selectedLanguage);
    localStorage.setItem("appLanguage", selectedLanguage);
    console.log('setting lang', selectedLanguage)

    navigate("/editor");
  };

  return (
    <Container
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'transparent'
      }}
    >
      <Card sx={{ minWidth: 400, maxWidth: 500, padding: 8 }}>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom align="center" sx={{ mb: 4 }}>
            {t("selectLanguage")}
          </Typography>

          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1  // Aggiunge spazio tra gli elementi
          }}>
            <FormControl sx={{ flexGrow: 1 }}>
              <Select
                size="small"
                value={selectedLanguage}
                onChange={handleSelectChange}
                variant="outlined"
                sx={{
                  height: '40px',
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#b3b3b3',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#b3b3b3',
                  },
                  '.MuiMenuItem-root.Mui-selected': {
                    backgroundColor: '#ccc',
                    '&:hover': {
                      backgroundColor: '#b3b3b3'
                    }
                  }
                }}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="it">Italian</MenuItem>
              </Select>
            </FormControl>

            <Button
              size="medium"
              variant="contained"
              onClick={handleSave}
              sx={{
                minWidth: 120,
                height: '40px',
                backgroundColor: '#5453a7',
                '&:hover': {
                  backgroundColor: '#a29ec2'
                }
              }}
            >
              Apply
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default LanguageSelector;